// Synchronous "merge clips and images into one vertical video" endpoint for
// the news shorts flow (Citadel review -> n8n -> here).
//
//   POST /shorts/assemble
//     { "items": [ { "type": "image", "url": "<image link>" },
//                  { "type": "clip",  "url": "<direct video link>", "start": 11, "end": 25 }, ... ],
//       "width"?, "height"?, "fps"?, "imageSeconds"?, "fit"?, "maxSeconds"? }
//     -> video/mp4 (silent: the music comes from the Canva template)
//
// `items` is the final order. The same video link can appear several times
// with different windows (it is downloaded once). Every piece is cut or built
// at the same size and frame rate, then joined, so the result plays smoothly.
// Still images get a slow zoom so they move.
//
//   POST /shorts/stitch
//     { "items": [ { "url": "<scene video>" }, ... ],
//       "music"?: { "url": "<audio file>", "volume"?: 0.25, "fadeSeconds"?: 1.5 },
//       "width"?, "height"?, "fps"?, "maxSeconds"? }
//     -> video/mp4: the scene videos (exported from Canva) joined in order, with one
//        background music track under the whole thing when `music` is given.
//
// Same rules as src/split.js: links must be direct files on public hosts
// (SSRF guard, size cap), nothing persists (a temp folder per request that is
// deleted when it ends), and only one assembly runs at a time (429 otherwise).

const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { pipeline } = require("stream/promises");
const { execFile } = require("child_process");
const { _internal: split } = require("./split");

const { SplitError, runFfmpeg, makeClip, downloadUrlToFile } = split;

const SHORTS_ROOT = path.join(os.tmpdir(), "shorts");
const TOTAL_TIMEOUT_MS = 40 * 60 * 1000;
const MAX_ITEMS = 30;
const DEFAULT_MAX_SECONDS = Number(process.env.SHORTS_MAX_SECONDS) || 180;
const FITS = new Set(["blur", "contain", "cover"]);

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function parseAssembleBody(body) {
  const b = body || {};
  if (!Array.isArray(b.items) || b.items.length === 0) {
    throw new SplitError(400, "invalid_request", "items must be a non-empty list.");
  }
  if (b.items.length > MAX_ITEMS) {
    throw new SplitError(400, "too_many_items", `At most ${MAX_ITEMS} items can be merged.`);
  }

  const dim = (v, def, name) => {
    if (v === undefined || v === null) return def;
    const n = toNumber(v);
    if (!Number.isInteger(n) || n < 240 || n > 2160 || n % 2 !== 0) {
      throw new SplitError(400, "invalid_request", `${name} must be an even whole number between 240 and 2160.`);
    }
    return n;
  };
  const width = dim(b.width, 1080, "width");
  const height = dim(b.height, 1920, "height");

  const fpsRaw = b.fps === undefined || b.fps === null ? 30 : toNumber(b.fps);
  if (!Number.isInteger(fpsRaw) || fpsRaw < 24 || fpsRaw > 60) {
    throw new SplitError(400, "invalid_request", "fps must be a whole number between 24 and 60.");
  }
  const imageSeconds = b.imageSeconds === undefined || b.imageSeconds === null ? 3 : toNumber(b.imageSeconds);
  if (!Number.isFinite(imageSeconds) || imageSeconds < 1 || imageSeconds > 10) {
    throw new SplitError(400, "invalid_request", "imageSeconds must be between 1 and 10.");
  }
  const fit = b.fit === undefined || b.fit === null ? "blur" : String(b.fit);
  if (!FITS.has(fit)) {
    throw new SplitError(400, "invalid_request", "fit must be one of: blur, contain, cover.");
  }
  const maxSeconds = b.maxSeconds === undefined || b.maxSeconds === null ? DEFAULT_MAX_SECONDS : toNumber(b.maxSeconds);
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) {
    throw new SplitError(400, "invalid_request", "maxSeconds must be a positive number.");
  }

  let total = 0;
  const items = b.items.map((it, i) => {
    if (!it || typeof it !== "object" || typeof it.url !== "string" || !it.url.trim()) {
      throw new SplitError(400, "invalid_request", `items[${i}] needs a url.`);
    }
    const url = it.url.trim();
    if (it.type === "image") {
      total += imageSeconds;
      return { type: "image", url };
    }
    if (it.type === "clip") {
      const start = toNumber(it.start);
      const end = toNumber(it.end);
      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end <= start) {
        throw new SplitError(400, "invalid_request", `items[${i}] needs a start (0 or more) before its end.`);
      }
      total += end - start;
      return { type: "clip", url, start, end };
    }
    throw new SplitError(400, "invalid_request", `items[${i}].type must be "image" or "clip".`);
  });

  if (total > maxSeconds) {
    throw new SplitError(400, "too_long", `The merged video would run ${total.toFixed(1)}s; the limit is ${maxSeconds}s.`);
  }
  return { items, width, height, fps: fpsRaw, imageSeconds, fit, total };
}

/** A still image that slowly zooms in, for `seconds`, at width x height. */
function imageFilter(width, height, fps, seconds) {
  const frames = Math.round(seconds * fps);
  return (
    `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2},` +
    `zoompan=z='min(zoom+0.0015,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},` +
    `setsar=1,format=yuv420p`
  );
}

/** Builds the merged video from items whose `file` is already on disk. */
async function assembleFiles(plan, workDir, outPath, signal) {
  const parts = [];
  for (let i = 0; i < plan.items.length; i++) {
    const item = plan.items[i];
    const seg = path.join(workDir, `seg-${i}.mp4`);
    if (item.type === "clip") {
      await makeClip(item.file, seg, signal, {
        start: item.start,
        end: item.end,
        fit: plan.fit,
        width: plan.width,
        height: plan.height,
        audio: false,
        crf: 20,
      });
    } else {
      await runFfmpeg(
        [
          "-i", item.file,
          "-vf", imageFilter(plan.width, plan.height, plan.fps, plan.imageSeconds),
          "-frames:v", String(Math.round(plan.imageSeconds * plan.fps)),
          "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
          "-movflags", "+faststart", seg,
        ],
        signal
      );
    }
    parts.push(seg);
  }

  const list = path.join(workDir, "list.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  // One re-encode so differing source frame rates still join cleanly.
  await runFfmpeg(
    [
      "-f", "concat", "-safe", "0", "-i", list,
      "-vf", `fps=${plan.fps},format=yuv420p`,
      "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", outPath,
    ],
    signal
  );
  return `${plan.items.length}-items-${plan.total.toFixed(1)}s-${plan.width}x${plan.height}`;
}


function probeDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      (err, stdout) => {
        if (err) return reject(err);
        const n = Number(String(stdout).trim());
        Number.isFinite(n) ? resolve(n) : reject(new Error("could not read the duration"));
      }
    );
  });
}

function parseStitchBody(body) {
  const b = body || {};
  if (!Array.isArray(b.items) || b.items.length === 0) {
    throw new SplitError(400, "invalid_request", "items must be a non-empty list.");
  }
  if (b.items.length > MAX_ITEMS) {
    throw new SplitError(400, "too_many_items", `At most ${MAX_ITEMS} scenes can be joined.`);
  }
  const base = parseAssembleBody({ items: [{ type: "image", url: "x" }], width: b.width, height: b.height, fps: b.fps });
  const items = b.items.map((it, i) => {
    if (!it || typeof it.url !== "string" || !it.url.trim()) {
      throw new SplitError(400, "invalid_request", `items[${i}] needs a url.`);
    }
    return { url: it.url.trim() };
  });
  let music = null;
  if (b.music) {
    if (typeof b.music.url !== "string" || !b.music.url.trim()) {
      throw new SplitError(400, "invalid_request", "music needs a url.");
    }
    const volume = b.music.volume === undefined ? 0.25 : toNumber(b.music.volume);
    const fade = b.music.fadeSeconds === undefined ? 1.5 : toNumber(b.music.fadeSeconds);
    if (!Number.isFinite(volume) || volume < 0 || volume > 2) {
      throw new SplitError(400, "invalid_request", "music.volume must be between 0 and 2.");
    }
    if (!Number.isFinite(fade) || fade < 0 || fade > 10) {
      throw new SplitError(400, "invalid_request", "music.fadeSeconds must be between 0 and 10.");
    }
    music = { url: b.music.url.trim(), volume, fade };
  }
  const maxSeconds = b.maxSeconds === undefined || b.maxSeconds === null ? DEFAULT_MAX_SECONDS : toNumber(b.maxSeconds);
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) {
    throw new SplitError(400, "invalid_request", "maxSeconds must be a positive number.");
  }
  return { items, music, width: base.width, height: base.height, fps: base.fps, maxSeconds };
}

/** Joins scene videos (already on disk) in order and lays one music track under them. */
async function stitchFiles(plan, workDir, outPath, signal) {
  const parts = [];
  for (let i = 0; i < plan.items.length; i++) {
    const seg = path.join(workDir, `scene-${i}.mp4`);
    await runFfmpeg(
      [
        "-i", plan.items[i].file,
        "-vf",
        `scale=${plan.width}:${plan.height}:force_original_aspect_ratio=decrease,` +
          `pad=${plan.width}:${plan.height}:(ow-iw)/2:(oh-ih)/2,fps=${plan.fps},setsar=1,format=yuv420p`,
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", seg,
      ],
      signal
    );
    parts.push(seg);
  }

  const list = path.join(workDir, "scenes.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  const joined = path.join(workDir, plan.music ? "joined.mp4" : "final.mp4");
  await runFfmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", joined], signal);

  const total = await probeDurationSeconds(joined);
  if (total > plan.maxSeconds) {
    throw new SplitError(400, "too_long", `The joined video runs ${total.toFixed(1)}s; the limit is ${plan.maxSeconds}s.`);
  }
  if (!plan.music) {
    fs.renameSync(joined, outPath);
    return `${plan.items.length}-scenes-${total.toFixed(1)}s`;
  }

  const fadeStart = Math.max(0, total - plan.music.fade);
  const af = `volume=${plan.music.volume},afade=t=out:st=${fadeStart.toFixed(2)}:d=${plan.music.fade}`;
  await runFfmpeg(
    [
      "-i", joined,
      "-stream_loop", "-1", "-i", plan.music.file,
      "-t", total.toFixed(3),
      "-map", "0:v", "-map", "1:a",
      "-af", af,
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", outPath,
    ],
    signal
  );
  return `${plan.items.length}-scenes-${total.toFixed(1)}s-music`;
}

function registerShortsRoutes(app, { downloadUrl = (u, d, sig) => downloadUrlToFile(u, d, sig) } = {}) {
  fs.rmSync(SHORTS_ROOT, { recursive: true, force: true });
  let busy = false;

  app.post("/shorts/assemble", async (req, res) => {
    let plan;
    try {
      plan = parseAssembleBody(req.body);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.code || "invalid_request", detail: err.message });
    }
    if (busy) {
      res.set("Retry-After", "30");
      return res.status(429).json({ error: "another assembly is already running", retry_after_seconds: 30 });
    }

    busy = true;
    const id = uuidv4();
    const dir = path.join(SHORTS_ROOT, id);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TOTAL_TIMEOUT_MS);
    res.on("close", () => {
      if (!res.writableFinished) ac.abort();
    });

    try {
      fs.mkdirSync(dir, { recursive: true });

      // Download each distinct link once.
      const files = new Map();
      for (const item of plan.items) {
        if (files.has(item.url)) continue;
        const dest = path.join(dir, `src-${files.size}`);
        try {
          await downloadUrl(item.url, dest, ac.signal);
        } catch (err) {
          if (ac.signal.aborted) throw err;
          if (err instanceof SplitError) throw err;
          throw new SplitError(502, "download_failed", `Could not download ${item.url}: ${err.message}`);
        }
        if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
          throw new SplitError(502, "download_failed", `Downloaded file is empty: ${item.url}`);
        }
        files.set(item.url, dest);
      }
      plan.items.forEach((item) => {
        item.file = files.get(item.url);
      });

      const out = path.join(dir, "merged.mp4");
      const mode = await assembleFiles(plan, dir, out, ac.signal);
      if (!fs.existsSync(out) || fs.statSync(out).size === 0) {
        throw new SplitError(500, "no_output", "ffmpeg finished but produced no output file.");
      }

      res.set({
        "Content-Type": "video/mp4",
        "Content-Length": String(fs.statSync(out).size),
        "Content-Disposition": 'attachment; filename="merged.mp4"',
        "Cache-Control": "no-store",
        "X-Shorts-Mode": mode,
      });
      await pipeline(fs.createReadStream(out), res);
      console.log(`Shorts assemble ${id} delivered (${mode}).`);
    } catch (err) {
      const status = err instanceof SplitError ? err.status : ac.signal.aborted ? 504 : 500;
      const code = err instanceof SplitError ? err.code : ac.signal.aborted ? "aborted_or_timed_out" : "assemble_failed";
      console.error(`Shorts assemble ${id} failed [${code}]:`, err.message);
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
  });

  app.post("/shorts/stitch", async (req, res) => {
    let plan;
    try {
      plan = parseStitchBody(req.body);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.code || "invalid_request", detail: err.message });
    }
    if (busy) {
      res.set("Retry-After", "30");
      return res.status(429).json({ error: "another assembly is already running", retry_after_seconds: 30 });
    }

    busy = true;
    const id = uuidv4();
    const dir = path.join(SHORTS_ROOT, id);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TOTAL_TIMEOUT_MS);
    res.on("close", () => {
      if (!res.writableFinished) ac.abort();
    });

    try {
      fs.mkdirSync(dir, { recursive: true });
      let n = 0;
      const fetchTo = async (url) => {
        const dest = path.join(dir, `in-${n++}`);
        try {
          await downloadUrl(url, dest, ac.signal);
        } catch (err) {
          if (ac.signal.aborted || err instanceof SplitError) throw err;
          throw new SplitError(502, "download_failed", `Could not download ${url}: ${err.message}`);
        }
        if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
          throw new SplitError(502, "download_failed", `Downloaded file is empty: ${url}`);
        }
        return dest;
      };
      for (const item of plan.items) item.file = await fetchTo(item.url);
      if (plan.music) plan.music.file = await fetchTo(plan.music.url);

      const out = path.join(dir, "stitched.mp4");
      const mode = await stitchFiles(plan, dir, out, ac.signal);
      if (!fs.existsSync(out) || fs.statSync(out).size === 0) {
        throw new SplitError(500, "no_output", "ffmpeg finished but produced no output file.");
      }

      res.set({
        "Content-Type": "video/mp4",
        "Content-Length": String(fs.statSync(out).size),
        "Content-Disposition": 'attachment; filename="stitched.mp4"',
        "Cache-Control": "no-store",
        "X-Shorts-Mode": mode,
      });
      await pipeline(fs.createReadStream(out), res);
      console.log(`Shorts stitch ${id} delivered (${mode}).`);
    } catch (err) {
      const status = err instanceof SplitError ? err.status : ac.signal.aborted ? 504 : 500;
      const code = err instanceof SplitError ? err.code : ac.signal.aborted ? "aborted_or_timed_out" : "stitch_failed";
      console.error(`Shorts stitch ${id} failed [${code}]:`, err.message);
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
  });
}

module.exports = { registerShortsRoutes, _internal: { parseAssembleBody, assembleFiles, imageFilter, parseStitchBody, stitchFiles } };
