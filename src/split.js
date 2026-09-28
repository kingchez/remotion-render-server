// Synchronous "split a video into its two tracks" endpoints, for the
// repurpose flow (Citadel -> n8n -> here).
//
//   POST /split/video  { "file_id": "<Drive file id>" }  -> video/mp4   (picture only, audio removed)
//   POST /split/audio  { "file_id": "<Drive file id>" }  -> audio/mpeg  (the audio track only, mp3)
//
// Two endpoints, one file each, so every response is a single plain binary
// n8n can hand straight to a Google Drive upload node.
//
// NOTHING PERSISTS. Each request works inside its own temp directory under
// <tmp>/split/<uuid>, which is deleted when the request ends - success,
// failure, timeout, or the caller hanging up mid-way. There is no job id,
// no in-memory record, no polling and nothing for the prune timers to
// clean. A startup sweep also clears <tmp>/split in case a crash ever
// left something behind. Only one split runs at a time (429 otherwise):
// this keeps disk use to a single working copy and matches the pipeline's
// one-heavy-process-at-a-time rule.
//
// Quality: the picture is stream-COPIED (bit-identical, no re-encode, near
// instant) whenever the source is H.264/HEVC; otherwise it is re-encoded to
// H.264 at CRF 14 (visually lossless) so the mp4 plays everywhere. Audio is
// mp3 at LAME VBR quality 0 (~245 kbps, the highest VBR setting).
//
// ffmpeg/ffprobe are run with execFile + an argument array - no shell, so a
// file id can never be interpreted as a command.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { v4: uuidv4 } = require("uuid");
const { fetchDriveFile } = require("./drive");

const execFileP = promisify(execFile);

const SPLIT_ROOT = path.join(os.tmpdir(), "split");
const FILE_ID_RE = /^[a-zA-Z0-9_-]{10,100}$/;
const TOTAL_TIMEOUT_MS = 40 * 60 * 1000; // hard ceiling for one whole request
const COPY_CODECS = new Set(["h264", "hevc"]);

class SplitError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Public Drive download. Tries the usercontent endpoint first (serves large
// public files directly with confirm=t), then falls back to the shared
// drive.js flow, which also produces the clear "not shared / wrong id"
// error messages.
async function fetchPublicDriveFile(fileId, signal) {
  const fast = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
  try {
    const res = await fetch(fast, { signal });
    const type = res.headers.get("content-type") || "";
    if (res.ok && res.body && !type.includes("text/html")) return res;
    if (res.body) await res.body.cancel().catch(() => {});
  } catch (err) {
    if (signal && signal.aborted) throw err;
    // network hiccup on the fast path - fall through to the standard flow
  }
  return fetchDriveFile(fileId, signal);
}

async function defaultDownload(fileId, destPath, signal) {
  const res = await fetchPublicDriveFile(fileId, signal);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath), { signal });
}

async function probeStream(file, selector, signal) {
  try {
    const { stdout } = await execFileP(
      "ffprobe",
      ["-v", "error", "-select_streams", selector, "-show_entries", "stream=codec_name,channels", "-of", "json", file],
      { signal, maxBuffer: 1024 * 1024 }
    );
    const streams = JSON.parse(stdout || "{}").streams || [];
    return streams[0] || null;
  } catch (err) {
    if (signal && signal.aborted) throw err;
    throw new SplitError(422, "unreadable_media", "The downloaded file could not be read as a video/audio file.");
  }
}

async function runFfmpeg(args, signal) {
  try {
    await execFileP("ffmpeg", ["-nostdin", "-y", "-loglevel", "error", ...args], {
      signal,
      timeout: TOTAL_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (err) {
    if (signal && signal.aborted) throw err;
    const detail = String(err.stderr || err.message || "").trim().slice(0, 500);
    throw new SplitError(500, "ffmpeg_failed", `ffmpeg failed: ${detail}`);
  }
}

async function makeVideoOnly(src, out, signal) {
  const stream = await probeStream(src, "v:0", signal);
  if (!stream) throw new SplitError(422, "no_video_track", "The file has no video track.");

  const base = ["-i", src, "-map", "0:v:0", "-an", "-sn", "-dn"];
  const tail = ["-movflags", "+faststart", out];

  if (COPY_CODECS.has(stream.codec_name)) {
    try {
      await runFfmpeg([...base, "-c:v", "copy", ...tail], signal);
      return "copy";
    } catch (err) {
      if (signal && signal.aborted) throw err;
      // copy failed for this file - fall through to a full re-encode
    }
  }
  await runFfmpeg([...base, "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", ...tail], signal);
  return "reencode";
}

async function makeAudioOnly(src, out, signal) {
  const stream = await probeStream(src, "a:0", signal);
  if (!stream) throw new SplitError(422, "no_audio_track", "The file has no audio track.");

  const args = ["-i", src, "-map", "0:a:0", "-vn", "-sn", "-dn", "-c:a", "libmp3lame", "-q:a", "0"];
  if (stream.channels > 2) args.push("-ac", "2"); // mp3 supports at most stereo
  args.push(out);
  await runFfmpeg(args, signal);
  return "mp3-vbr0";
}

const KINDS = {
  video: { file: "video-only.mp4", type: "video/mp4", make: makeVideoOnly },
  audio: { file: "audio.mp3", type: "audio/mpeg", make: makeAudioOnly },
};

function registerSplitRoutes(app, { download = defaultDownload } = {}) {
  // Anything left from a crash/redeploy is unrecoverable by design - clear it.
  fs.rmSync(SPLIT_ROOT, { recursive: true, force: true });

  let busy = false;

  async function handle(kindKey, req, res) {
    const kind = KINDS[kindKey];
    const fileId = req.body && req.body.file_id;
    if (typeof fileId !== "string" || !FILE_ID_RE.test(fileId)) {
      return res.status(400).json({ error: "file_id (a Google Drive file id) is required" });
    }
    if (busy) {
      res.set("Retry-After", "30");
      return res.status(429).json({ error: "another split is already running", retry_after_seconds: 30 });
    }

    busy = true;
    const splitId = uuidv4();
    const dir = path.join(SPLIT_ROOT, splitId);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TOTAL_TIMEOUT_MS);
    // Caller hung up before we finished -> stop everything, clean up below.
    res.on("close", () => {
      if (!res.writableFinished) ac.abort();
    });

    try {
      fs.mkdirSync(dir, { recursive: true });
      const src = path.join(dir, "source");
      const out = path.join(dir, kind.file);

      try {
        await download(fileId, src, ac.signal);
      } catch (err) {
        if (ac.signal.aborted) throw err;
        throw new SplitError(502, "drive_download_failed", err.message);
      }
      if (!fs.existsSync(src) || fs.statSync(src).size === 0) {
        throw new SplitError(502, "drive_download_failed", "Downloaded file is empty.");
      }

      const mode = await kind.make(src, out, ac.signal);
      if (!fs.existsSync(out) || fs.statSync(out).size === 0) {
        throw new SplitError(500, "no_output", "ffmpeg finished but produced no output file.");
      }

      res.set({
        "Content-Type": kind.type,
        "Content-Length": String(fs.statSync(out).size),
        "Content-Disposition": `attachment; filename="${fileId}-${kind.file}"`,
        "Cache-Control": "no-store",
        "X-Split-Mode": mode,
      });
      await pipeline(fs.createReadStream(out), res);
      console.log(`Split (${kindKey}) ${splitId} for Drive file ${fileId} delivered (${mode}).`);
    } catch (err) {
      const status = err instanceof SplitError ? err.status : ac.signal.aborted ? 504 : 500;
      const code = err instanceof SplitError ? err.code : ac.signal.aborted ? "aborted_or_timed_out" : "split_failed";
      console.error(`Split (${kindKey}) ${splitId} failed [${code}]:`, err.message);
      if (!res.headersSent) {
        res.status(status).json({ error: code, detail: err.message });
      } else {
        res.destroy();
      }
    } finally {
      clearTimeout(timer);
      fs.rm(dir, { recursive: true, force: true }, () => {});
      busy = false;
    }
  }

  app.post("/split/video", (req, res) => handle("video", req, res));
  app.post("/split/audio", (req, res) => handle("audio", req, res));
}

module.exports = { registerSplitRoutes };
