const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const { downloadFile, uploadFile, getFileMetadata } = require("./drive");
const { resolveIconSvg } = require("./icons");
const { renderSceneVideo } = require("./render");

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

// In-memory job store. Simple on purpose: this server processes one render
// at a time and doesn't need to survive restarts mid-job for now.
const jobs = new Map();

function tempDirFor(jobId) {
  return path.join(os.tmpdir(), "renders", jobId);
}

function cleanup(jobId) {
  const dir = tempDirFor(jobId);
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/renders", async (req, res) => {
  const {
    scenes,
    audioDriveFileId,
    outputDriveFolderId,
    orientation = "vertical",
    look,
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
  if (!outputDriveFolderId) {
    return res.status(400).json({ error: "outputDriveFolderId is required" });
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
  processJob(jobId, { scenes, audioDriveFileId, outputDriveFolderId, orientation, look, callbackUrl }).catch(
    (err) => {
      jobs.set(jobId, {
        status: "error",
        error: err.message,
        createdAt: jobs.get(jobId)?.createdAt,
      });
      cleanup(jobId);
      fireCallback(callbackUrl, { jobId, status: "error", error: err.message });
    }
  );
});

// Best-effort POST to the caller's callback URL when a job finishes.
// Never throws - a broken callback URL shouldn't affect the render itself,
// since polling GET /renders/:id still works regardless.
async function fireCallback(callbackUrl, payload) {
  if (!callbackUrl) return;
  try {
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`Callback to ${callbackUrl} failed:`, err.message);
  }
}

app.get("/renders/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json({ jobId: req.params.id, ...job });
});

// Maps a Drive file's real mimeType to the correct local extension. These
// become file:// URLs handed straight to Chromium, which partly relies on
// extension for MIME sniffing - so a mismatched guess (e.g. a transparent
// PNG saved as .jpg) can misrender. Falls back to the old key-name guess
// only if metadata lookup fails or the mimeType isn't in this table.
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

async function processJob(jobId, { scenes, audioDriveFileId, outputDriveFolderId, orientation, look, callbackUrl }) {
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
      resolved[targetKey] = `file://${localPath}`;
      delete resolved[key];
    }

    if (resolved.icon) {
      resolved.iconSvg = resolveIconSvg(resolved.icon);
    }
    if (Array.isArray(resolved.items)) {
      resolved.items = resolved.items.map((item) =>
        item?.icon ? { ...item, iconSvg: resolveIconSvg(item.icon) } : item
      );
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

    if (Array.isArray(scene.objects)) {
      const resolvedObjects = [];
      for (let o = 0; o < scene.objects.length; o++) {
        resolvedObjects.push(await resolveAssets(scene.objects[o], i, `obj${o}-`));
      }
      resolvedScenes.push({ ...scene, audioUrl: sceneAudioUrl, objects: resolvedObjects });
    } else {
      const props = await resolveAssets(scene.props || {}, i, "");
      resolvedScenes.push({ ...scene, audioUrl: sceneAudioUrl, props });
    }
  }

  let audioUrl = null;
  if (audioDriveFileId) {
    const audioPath = path.join(dir, "audio.mp3");
    await downloadFile(audioDriveFileId, audioPath);
    audioUrl = `file://${audioPath}`;
  }

  const outputPath = path.join(dir, "output.mp4");
  await renderSceneVideo({ scenes: resolvedScenes, audioUrl, outputPath, orientation, look });

  const uploadResult = await uploadFile(outputPath, outputDriveFolderId, "video/mp4");

  jobs.set(jobId, {
    status: "done",
    createdAt: jobs.get(jobId).createdAt,
    result: uploadResult,
  });

  cleanup(jobId); // nothing stays on the VPS after upload
  fireCallback(callbackUrl, { jobId, status: "done", result: uploadResult });
}

app.listen(PORT, () => {
  console.log(`Render server listening on port ${PORT}`);
});
