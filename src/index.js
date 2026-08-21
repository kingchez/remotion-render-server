const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const { downloadFile, getFileMetadata } = require("./drive");
const { resolveIconSvg } = require("./icons");
const { renderSceneVideo } = require("./render");

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

// Used to build the output_url handed to the caller's webhook/GET response -
// this server no longer uploads anywhere itself, so the caller (n8n) needs
// a real URL back to this server to actually fetch the rendered file.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://render.viralnotely.com";

// Every downloaded Drive asset (voiceover audio, media_assets images/video)
// lands here before render, keyed by jobId. @remotion/renderer's own asset
// pre-download step (download-and-map-assets-to-file.js) only accepts
// http:// / https:// sources - file:// is explicitly rejected, since that
// step is built to fetch remote media, not read local paths directly. So
// this directory is also served over plain local HTTP (see the
// express.static mount below) and every resolved asset URL points at
// that local server instead of a file:// path. Remotion's headless
// Chromium runs in this same container/process, so 127.0.0.1 is always
// reachable regardless of PUBLIC_BASE_URL/deployment networking.
const RENDERS_ROOT = path.join(os.tmpdir(), "renders");
app.use("/tmp-assets", express.static(RENDERS_ROOT));

function localAssetUrl(absolutePath) {
  const relative = path.relative(RENDERS_ROOT, absolutePath).split(path.sep).join("/");
  return `http://127.0.0.1:${PORT}/tmp-assets/${relative}`;
}

// In-memory job store, backed by disk for anything that survives a crash/
// redeploy - see rehydrateJobsFromDisk() below, called once at startup.
// A job's real "createdAt" for done jobs is the output file's own mtime,
// not a value kept only in this Map, specifically so a restart can
// reconstruct it without needing any date encoded into a filename.
const jobs = new Map();

function tempDirFor(jobId) {
  return path.join(RENDERS_ROOT, jobId);
}

function cleanup(jobId) {
  const dir = tempDirFor(jobId);
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

// Runs once at startup. A crash or redeploy wipes the in-memory `jobs` Map,
// but anything already written to disk survives untouched - including each
// output.mp4's own mtime, set by the filesystem the moment the render
// finished, which needs no separate date-tagging scheme to stay accurate
// across a restart. For every leftover job directory found:
//   - has a finished output.mp4, still within the 2-day window -> rehydrate
//     it back into `jobs` as status "done", so GET /renders/:id/output can
//     still serve it exactly as if the process never restarted.
//   - has a finished output.mp4, already past 2 days -> delete it now
//     rather than waiting for the next auto-prune pass.
//   - has no output.mp4 at all -> it was mid-render when the crash/restart
//     happened; that render can never be resumed, so delete it immediately.
function rehydrateJobsFromDisk() {
  const rendersRoot = path.join(os.tmpdir(), "renders");
  if (!fs.existsSync(rendersRoot)) return;

  const cutoffMs = Date.now() - AUTO_PRUNE_OLDER_THAN_DAYS * 24 * 60 * 60 * 1000;
  let rehydrated = 0;
  let discarded = 0;

  for (const jobId of fs.readdirSync(rendersRoot)) {
    const dir = path.join(rendersRoot, jobId);
    const outputPath = path.join(dir, "output.mp4");

    if (!fs.existsSync(outputPath)) {
      // Never finished rendering before the crash/restart - unrecoverable.
      fs.rmSync(dir, { recursive: true, force: true });
      discarded++;
      continue;
    }

    const finishedAtMs = fs.statSync(outputPath).mtimeMs;
    if (finishedAtMs < cutoffMs) {
      fs.rmSync(dir, { recursive: true, force: true });
      discarded++;
      continue;
    }

    jobs.set(jobId, { status: "done", createdAt: finishedAtMs, outputPath });
    rehydrated++;
  }

  if (rehydrated > 0 || discarded > 0) {
    console.log(`Startup recovery: rehydrated ${rehydrated} deliverable job(s), discarded ${discarded} unrecoverable/expired one(s).`);
  }
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/renders", async (req, res) => {
  const {
    scenes,
    audioDriveFileId,
    orientation = "vertical",
    look,
    music,
    callbackUrl,
  } = req.body || {};

  if (!["vertical", "horizontal"].includes(orientation)) {
    return res
      .status(400)
      .json({ error: "orientation must be 'vertical' or 'horizontal'" });
  }

  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ error: "scenes[] is required" });
  }
  // Each scene needs durationInFrames, plus EITHER the classic
  // component/props format OR the scene-graph objects[] format.
  for (const s of scenes) {
    if (!s.durationInFrames) {
      return res.status(400).json({ error: "each scene needs durationInFrames" });
    }
    const hasClassicFormat = s.component && s.props && typeof s.props === "object";
    const hasSceneGraphFormat = Array.isArray(s.objects) && s.objects.length > 0;
    if (!hasClassicFormat && !hasSceneGraphFormat) {
      return res.status(400).json({
        error: "each scene needs either {component, props} or a non-empty objects[] array",
      });
    }
  }

  const jobId = uuidv4();
  jobs.set(jobId, { status: "pending", createdAt: Date.now() });

  res.status(202).json({ jobId, status: "pending" });

  // Process asynchronously so the caller (n8n) gets an immediate jobId back
  processJob(jobId, { scenes, audioDriveFileId, orientation, look, music, callbackUrl }).catch(
    (err) => {
      jobs.set(jobId, {
        status: "error",
        error: err.message,
        createdAt: jobs.get(jobId)?.createdAt,
      });
      cleanup(jobId);
      fireCallback(callbackUrl, { source: "render", job_id: jobId, status: "error", error: err.message });
    }
  );
});

// POST to the caller's callback URL when a job finishes, with retries -
// matching the chatterbox-tts / whisperx webhook_sender.py behavior (4
// attempts, 2s/5s/15s backoff) so a momentary n8n blip doesn't silently
// drop the result. GET /renders/:id remains the fallback if all 4 fail.
//
// Delivery (webhook success, or a manual GET /renders/:id/output pull) no
// longer deletes anything by itself. The in-memory job record and the
// rendered file on disk both stay in place - fetchable any number of times
// - until the caller explicitly calls POST /renders/:id/ack. Only /ack
// deletes. Same contract as chatterbox-tts/whisperx's job stores, just
// applied to this in-memory Map + disk file instead of SQLite rows.
const CALLBACK_BACKOFF_MS = [2000, 5000, 15000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fireCallback(callbackUrl, payload) {
  if (!callbackUrl) return;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log(`Callback to ${callbackUrl} delivered (job_id=${payload.job_id}, status=${payload.status}) on attempt ${attempt}. Record kept until POST /renders/${payload.job_id}/ack is called.`);
        return;
      }
      console.warn(`Callback to ${callbackUrl} returned HTTP ${res.status} on attempt ${attempt}.`);
    } catch (err) {
      console.warn(`Callback to ${callbackUrl} failed on attempt ${attempt}:`, err.message);
    }
    if (attempt < 4) await sleep(CALLBACK_BACKOFF_MS[attempt - 1]);
  }
  console.error(`Callback to ${callbackUrl} failed after 4 attempts (job_id=${payload.job_id}). Giving up - job record kept in memory for manual GET /renders/${payload.job_id} pull.`);
}

app.get("/renders/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });

  const body = { jobId: req.params.id, status: job.status, createdAt: job.createdAt };
  if (job.status === "done") {
    // Just the fetch URL here, not the file itself - a status check must
    // stay cheap and repeatable. GET /renders/:id/output below is the
    // repeatable pull path; POST /renders/:id/ack is the only thing that
    // actually consumes (and cleans up) the render.
    body.output_url = `${PUBLIC_BASE_URL}/renders/${req.params.id}/output`;
  }
  if (job.status === "error") {
    body.error = job.error;
    // Record is kept (not cleared here) until POST /renders/:id/ack, same
    // as a "done" job - so the error can still be inspected repeatedly.
  }
  res.json(body);
});

// Repeatable manual pull. The rendered file stays on disk and the job
// record stays in memory regardless of how many times this is called - a
// webhook that never arrives, or n8n being down for an hour, can never lose
// a finished render, and re-fetching it doesn't consume it either. Only
// POST /renders/:id/ack (below) deletes anything.
app.get("/renders/:id/output", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  if (job.status !== "done" || !job.outputPath) {
    return res.status(409).json({ error: `job is not ready (status: ${job.status})` });
  }
  if (!fs.existsSync(job.outputPath)) {
    return res.status(410).json({ error: "output no longer available (already acknowledged and cleaned up, or pruned)" });
  }

  res.sendFile(job.outputPath, (err) => {
    if (err) {
      console.error(`Failed to send output for job ${req.params.id}:`, err.message);
      return;
    }
    console.log(`Output for job ${req.params.id} pulled via HTTP - nothing deleted; call POST /renders/${req.params.id}/ack once received.`);
  });
});

// The ONLY thing that deletes a finished job's in-memory record and its
// on-disk output directory. Call this once the result - from the webhook
// or a GET /renders/:id/output pull, possibly several of them - has been
// durably received. 409 if the job hasn't reached a terminal state yet.
app.post("/renders/:id/ack", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  if (job.status !== "done" && job.status !== "error") {
    return res.status(409).json({ error: `job is still ${job.status}; nothing to acknowledge yet` });
  }

  jobs.delete(req.params.id);
  cleanup(req.params.id);
  console.log(`Job ${req.params.id} acknowledged - record and any on-disk output cleared.`);
  res.json({ jobId: req.params.id, acknowledged: true });
});

// Admin cleanup, matching the chatterbox-tts / whisperx prune_jobs
// convention. In practice the job map self-cleans on every successful
// webhook delivery or terminal GET pull (see above), so this is a backstop
// for the rare case a job's callback failed all 4 retries AND nobody ever
// manually pulled it - it would otherwise sit in memory until the process
// restarts. older_than_days is compared against each job's createdAt.
// Shared by the manual admin endpoint below and the automatic internal
// timer (see near the bottom of this file) - one implementation, two
// triggers, so there's no risk of the two ever drifting apart.
function pruneStaleJobs(olderThanDays) {
  const cutoffMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let prunedCount = 0;
  for (const [jobId, job] of jobs.entries()) {
    if (typeof job.createdAt === "number" && job.createdAt < cutoffMs) {
      jobs.delete(jobId);
      cleanup(jobId); // remove any on-disk output nobody ever fetched via /output
      prunedCount++;
    }
  }
  return { prunedCount, remainingCount: jobs.size, olderThanDays };
}

app.delete("/admin/prune_jobs", (req, res) => {
  const olderThanDays = parseFloat(req.query.older_than_days) || 7;
  res.json(pruneStaleJobs(olderThanDays));
});

// Maps a Drive file's real mimeType to the correct local extension. These
// get served over the local HTTP static route (see localAssetUrl above)
// and handed to Chromium as regular URLs - the extension matters for
// correct Content-Type-driven MIME sniffing, not for URL scheme (that
// part is handled by localAssetUrl always producing http://, never
// file://). Falls back to the old key-name guess only if metadata lookup
// fails or the mimeType isn't in this table.
const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
};

async function processJob(jobId, { scenes, audioDriveFileId, orientation, look, music, callbackUrl }) {
  jobs.set(jobId, { status: "processing", createdAt: jobs.get(jobId).createdAt });

  const dir = tempDirFor(jobId);
  fs.mkdirSync(dir, { recursive: true });

  // Resolve every scene's Drive-hosted assets generically. Convention:
  // a prop named "somethingDriveFileId" gets downloaded and turned into
  // "somethingUrl" pointing at the local temp copy. Works for images,
  // videos, or any future style's assets without server code changes -
  // e.g. "imageDriveFileId" -> "imageUrl", "videoDriveFileId" -> "videoUrl".
  // Also resolves `icon: {library, name}` references to real SVG markup.
  // Applied uniformly to classic scene.props AND each object in the
  // scene-graph `objects` array, so both formats get the same treatment.
  async function resolveAssets(obj, sceneIndex, keyPrefix) {
    const resolved = { ...obj };

    for (const key of Object.keys(resolved)) {
      if (!key.endsWith("DriveFileId")) continue;
      const fileId = resolved[key];
      const targetKey = key.slice(0, -"DriveFileId".length) + "Url";
      const keyLower = key.toLowerCase();

      let ext;
      try {
        const meta = await getFileMetadata(fileId);
        ext = MIME_TO_EXT[meta.mimeType];
      } catch (err) {
        console.error(`Could not fetch Drive metadata for ${fileId}, falling back to name-based guess:`, err.message);
      }
      if (!ext) {
        ext = keyLower.includes("audio") ? ".mp3" : keyLower.includes("video") ? ".mp4" : ".jpg";
      }

      const localPath = path.join(dir, `scene-${sceneIndex}-${keyPrefix}${key}${ext}`);
      await downloadFile(fileId, localPath);
      resolved[targetKey] = localAssetUrl(localPath);
      delete resolved[key];
    }

    if (resolved.icon) {
      resolved.iconSvg = resolveIconSvg(resolved.icon);
    }
    // Generalized: recurse into each `items[]` entry through the same
    // resolver used for top-level props, so any *DriveFileId or icon
    // reference nested inside an item (e.g. MediaGrid's per-cell
    // imageDriveFileId) actually gets downloaded/resolved - previously
    // only `item.icon` was special-cased here, so a *DriveFileId key
    // inside an items[] entry silently never resolved. Guarded to plain
    // objects only: RankedList's `items` are plain strings, and spreading
    // a string into resolveAssets's `{...obj}` would corrupt it into a
    // character-indexed object, so primitives pass through untouched.
    if (Array.isArray(resolved.items)) {
      const resolvedItems = [];
      for (let idx = 0; idx < resolved.items.length; idx++) {
        const item = resolved.items[idx];
        resolvedItems.push(
          item && typeof item === "object"
            ? await resolveAssets(item, sceneIndex, `${keyPrefix}items${idx}-`)
            : item
        );
      }
      resolved.items = resolvedItems;
    }

    // Preset objects (scene-graph type "preset") carry their actual
    // component props nested one level deeper - resolve those too, or
    // any Drive file/icon reference inside a preset would silently
    // never get downloaded.
    if (resolved.type === "preset" && resolved.props) {
      resolved.props = await resolveAssets(resolved.props, sceneIndex, `${keyPrefix}preset-`);
    }

    return resolved;
  }

  const resolvedScenes = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Scene-level audioDriveFileId (per-scene voiceover) is resolved here,
    // outside the classic-vs-scene-graph branch below, so it works
    // identically for both scene formats. Previously this only ever ended
    // up on scene.props, which scene-graph (objects[]) scenes don't have -
    // meaning per-scene audio silently never played for any scene built
    // with the newer objects[] format.
    let sceneAudioUrl;
    if (scene.audioDriveFileId) {
      const resolved = await resolveAssets({ audioDriveFileId: scene.audioDriveFileId }, i, "scene-audio-");
      sceneAudioUrl = resolved.audioUrl;
    }

    // One-shot sound effects (whoosh/riser/click) - each entry can be
    // {driveFileId, atFrame, volume} or already {url, atFrame, volume}.
    // Resolved the same way any other Drive asset is, reusing the generic
    // resolver above rather than duplicating the download/extension logic.
    let resolvedSfx = scene.sfx;
    if (Array.isArray(scene.sfx)) {
      resolvedSfx = [];
      for (let fxIdx = 0; fxIdx < scene.sfx.length; fxIdx++) {
        const fx = scene.sfx[fxIdx] || {};
        if (fx.driveFileId) {
          const resolved = await resolveAssets({ audioDriveFileId: fx.driveFileId }, i, `sfx${fxIdx}-`);
          resolvedSfx.push({ atFrame: fx.atFrame, volume: fx.volume, url: resolved.audioUrl });
        } else {
          resolvedSfx.push(fx);
        }
      }
    }

    if (Array.isArray(scene.objects)) {
      const resolvedObjects = [];
      for (let o = 0; o < scene.objects.length; o++) {
        resolvedObjects.push(await resolveAssets(scene.objects[o], i, `obj${o}-`));
      }
      resolvedScenes.push({ ...scene, audioUrl: sceneAudioUrl, sfx: resolvedSfx, objects: resolvedObjects });
    } else {
      const props = await resolveAssets(scene.props || {}, i, "");
      resolvedScenes.push({ ...scene, audioUrl: sceneAudioUrl, sfx: resolvedSfx, props });
    }
  }

  let audioUrl = null;
  if (audioDriveFileId) {
    const audioPath = path.join(dir, "audio.mp3");
    await downloadFile(audioDriveFileId, audioPath);
    audioUrl = localAssetUrl(audioPath);
  }

  const outputPath = path.join(dir, "output.mp4");
  await renderSceneVideo({ scenes: resolvedScenes, audioUrl, outputPath, orientation, look, music });

  // No Drive upload here anymore - delivery is downstream, via n8n. The
  // rendered file stays on local disk (not cleaned up) until it's actually
  // been fetched through GET /renders/:id/output, so a webhook failure -
  // even all 4 retries failing - never loses the finished render, only
  // delays its delivery.
  jobs.set(jobId, {
    status: "done",
    createdAt: jobs.get(jobId).createdAt,
    outputPath,
  });

  fireCallback(callbackUrl, {
    source: "render",
    job_id: jobId,
    status: "done",
    output_url: `${PUBLIC_BASE_URL}/renders/${jobId}/output`,
  });
}

// Automatic internal cleanup - undelivered render output (a job whose
// webhook failed all 4 retries AND nobody ever called GET /renders/:id/output)
// would otherwise sit on disk forever with nothing external ever prompting
// its removal. Runs on its own schedule inside this process; /admin/prune_jobs
// above still exists for an on-demand/custom-cutoff run, but isn't required
// for this to happen.
const AUTO_PRUNE_OLDER_THAN_DAYS = 2;
const AUTO_PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

// Recover whatever's on disk before accepting any requests, so a GET to an
// old job_id right after a restart has a chance of still working instead
// of always 404ing until the next render happens to overwrite that jobId.
rehydrateJobsFromDisk();

setInterval(() => {
  const result = pruneStaleJobs(AUTO_PRUNE_OLDER_THAN_DAYS);
  if (result.prunedCount > 0) {
    console.log(`Auto-prune: removed ${result.prunedCount} job(s) older than ${AUTO_PRUNE_OLDER_THAN_DAYS} day(s). ${result.remainingCount} remaining.`);
  }
}, AUTO_PRUNE_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Render server listening on port ${PORT}`);
});
