// Synchronous "split a video into its two tracks" endpoints, for the
// repurpose flow (Citadel -> n8n -> here).
//
//   POST /split/video  { "url": "<video link>" }  -> video/mp4   (picture only, audio removed)
//   POST /split/audio  { "url": "<video link>" }  -> audio/mpeg  (the audio track only, mp3)
//
// The source is a single `url`: a Google Drive link or ANY direct http(s)
// link to a video file (storage bucket, CDN...). If a Drive file id is
// needed it is extracted from the URL here - callers never pass ids. Page
// links (YouTube, Vimeo, Bilibili...) are
// not direct files and are rejected with 422 not_a_direct_file. Non-Drive
// links are fetched with an SSRF guard: public hosts only, every redirect
// re-checked, size-capped (SPLIT_MAX_BYTES, default 10 GB).
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
const dns = require("dns");
const net = require("net");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { Readable } = require("stream");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");
const { v4: uuidv4 } = require("uuid");
const { fetchDriveFile } = require("./drive");

const execFileP = promisify(execFile);

const SPLIT_ROOT = path.join(os.tmpdir(), "split");
const TOTAL_TIMEOUT_MS = 40 * 60 * 1000; // hard ceiling for one whole request
const COPY_CODECS = new Set(["h264", "hevc"]);
const MAX_DOWNLOAD_BYTES = Number(process.env.SPLIT_MAX_BYTES) || 10 * 1024 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com", "drive.usercontent.google.com"]);

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

// ---- generic (non-Drive) URL download, with an SSRF guard ---------------

function isPrivateIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return lower.startsWith("fc") || lower.startsWith("fd") || /^fe[89ab]/.test(lower);
  }
  return true; // not an IP at all - treat as unsafe
}

function parseHttpUrl(urlStr) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    throw new SplitError(400, "invalid_url", "That is not a valid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new SplitError(400, "invalid_url", "Only http(s) URLs are supported.");
  }
  return u;
}

// Refuses anything that resolves to a private/internal address, so a video
// link can never be used to reach other services on this VPS.
async function assertPublicHttpUrl(urlStr, lookup = dns.promises.lookup) {
  const u = parseHttpUrl(urlStr);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  let addresses;
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      const results = await lookup(host, { all: true });
      addresses = results.map((r) => r.address);
    } catch {
      throw new SplitError(502, "download_failed", `Could not resolve host ${host}.`);
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new SplitError(400, "blocked_url", "That URL points to a private or internal address.");
  }
  return u;
}

async function downloadUrlToFile(urlStr, destPath, signal, opts = {}) {
  const lookup = opts.lookup || dns.promises.lookup;
  const maxBytes = opts.maxBytes || MAX_DOWNLOAD_BYTES;
  let current = urlStr;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = opts.allowPrivate ? parseHttpUrl(current) : await assertPublicHttpUrl(current, lookup);
    const res = await fetch(u, { signal, redirect: "manual" });

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      if (res.body) await res.body.cancel().catch(() => {});
      current = new URL(location, u).toString();
      continue;
    }
    if (!res.ok || !res.body) {
      if (res.body) await res.body.cancel().catch(() => {});
      throw new SplitError(502, "download_failed", `Download failed: HTTP ${res.status}`);
    }

    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html")) {
      await res.body.cancel().catch(() => {});
      throw new SplitError(422, "not_a_direct_file", "That link returned a web page, not a video file. Use a direct link to the file itself.");
    }
    if (type.includes("mpegurl")) {
      await res.body.cancel().catch(() => {});
      throw new SplitError(422, "unsupported_stream", "Streaming playlists (.m3u8) aren't supported here - use a direct video file link.");
    }
    const declared = Number(res.headers.get("content-length"));
    if (declared && declared > maxBytes) {
      await res.body.cancel().catch(() => {});
      throw new SplitError(413, "file_too_large", `File is larger than the ${maxBytes} byte limit.`);
    }

    let received = 0;
    const counter = new Transform({
      transform(chunk, _enc, cb) {
        received += chunk.length;
        if (received > maxBytes) return cb(new SplitError(413, "file_too_large", `File is larger than the ${maxBytes} byte limit.`));
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(res.body), counter, fs.createWriteStream(destPath), { signal });
    return;
  }
  throw new SplitError(502, "too_many_redirects", `More than ${MAX_REDIRECTS} redirects.`);
}

// Works out where the video comes from. Drive links (and bare file ids) use
// the Drive downloader; any other http(s) link is fetched directly.
function resolveSource(body) {
  const url = body && body.url;
  if (typeof url !== "string" || !url.trim()) {
    throw new SplitError(400, "invalid_request", "url (a link to the video file) is required.");
  }

  const u = parseHttpUrl(url.trim());
  if (DRIVE_HOSTS.has(u.hostname.toLowerCase())) {
    const m = u.href.match(/\/d\/([a-zA-Z0-9_-]{10,100})/) || u.href.match(/[?&]id=([a-zA-Z0-9_-]{10,100})/);
    if (!m) throw new SplitError(400, "invalid_url", "Could not find a file id in that Google Drive link.");
    return { kind: "drive", id: m[1], label: m[1] };
  }
  return { kind: "url", url: u.href, label: "source" };
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

function registerSplitRoutes(app, { download = defaultDownload, downloadUrl = (u, d, sig) => downloadUrlToFile(u, d, sig) } = {}) {
  // Anything left from a crash/redeploy is unrecoverable by design - clear it.
  fs.rmSync(SPLIT_ROOT, { recursive: true, force: true });

  let busy = false;

  async function handle(kindKey, req, res) {
    const kind = KINDS[kindKey];
    let source;
    try {
      source = resolveSource(req.body);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.code || "invalid_request", detail: err.message });
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
        if (source.kind === "drive") await download(source.id, src, ac.signal);
        else await downloadUrl(source.url, src, ac.signal);
      } catch (err) {
        if (ac.signal.aborted) throw err;
        if (err instanceof SplitError) throw err;
        throw new SplitError(502, source.kind === "drive" ? "drive_download_failed" : "download_failed", err.message);
      }
      if (!fs.existsSync(src) || fs.statSync(src).size === 0) {
        throw new SplitError(502, "download_failed", "Downloaded file is empty.");
      }

      const mode = await kind.make(src, out, ac.signal);
      if (!fs.existsSync(out) || fs.statSync(out).size === 0) {
        throw new SplitError(500, "no_output", "ffmpeg finished but produced no output file.");
      }

      res.set({
        "Content-Type": kind.type,
        "Content-Length": String(fs.statSync(out).size),
        "Content-Disposition": `attachment; filename="${source.label}-${kind.file}"`,
        "Cache-Control": "no-store",
        "X-Split-Mode": mode,
      });
      await pipeline(fs.createReadStream(out), res);
      console.log(`Split (${kindKey}) ${splitId} from ${source.kind} source ${source.label} delivered (${mode}).`);
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

module.exports = {
  registerSplitRoutes,
  _internal: { assertPublicHttpUrl, isPrivateAddress, downloadUrlToFile, resolveSource },
};
