const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const { downloadFile, uploadFile } = require("./drive");
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
  // Each scene must declare which style component to use, its duration,
  // and a props object holding that component's specific fields.
  for (const s of scenes) {
    if (!s.component) {
      return res.status(400).json({ error: "each scene needs a component name" });
    }
    if (!s.durationInFrames) {
      return res.status(400).json({ error: "each scene needs durationInFrames" });
    }
    if (!s.props || typeof s.props !== "object") {
      return res.status(400).json({ error: "each scene needs a props object" });
    }
  }

  const jobId = uuidv4();
  jobs.set(jobId, { status: "pending", createdAt: Date.now() });

  res.status(202).json({ jobId, status: "pending" });

  // Process asynchronously so the caller (n8n) gets an immediate jobId back
  processJob(jobId, { scenes, audioDriveFileId, outputDriveFolderId, orientation }).catch(
    (err) => {
      jobs.set(jobId, {
        status: "error",
        error: err.message,
        createdAt: jobs.get(jobId)?.createdAt,
      });
      cleanup(jobId);
    }
  );
});

app.get("/renders/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json({ jobId: req.params.id, ...job });
});

async function processJob(jobId, { scenes, audioDriveFileId, outputDriveFolderId, orientation }) {
  jobs.set(jobId, { status: "processing", createdAt: jobs.get(jobId).createdAt });

  const dir = tempDirFor(jobId);
  fs.mkdirSync(dir, { recursive: true });

  // Resolve every scene's Drive-hosted assets generically. Convention:
  // a prop named "somethingDriveFileId" gets downloaded and turned into
  // "somethingUrl" pointing at the local temp copy. Works for images,
  // videos, or any future style's assets without server code changes -
  // e.g. "imageDriveFileId" -> "imageUrl", "videoDriveFileId" -> "videoUrl".
  const resolvedScenes = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const props = { ...scene.props };

    for (const key of Object.keys(props)) {
      if (!key.endsWith("DriveFileId")) continue;
      const fileId = props[key];
      const targetKey = key.slice(0, -"DriveFileId".length) + "Url";
      const keyLower = key.toLowerCase();
      const ext = keyLower.includes("audio") ? ".mp3" : keyLower.includes("video") ? ".mp4" : ".jpg";
      const localPath = path.join(dir, `scene-${i}-${key}${ext}`);
      await downloadFile(fileId, localPath);
      props[targetKey] = `file://${localPath}`;
      delete props[key];
    }

    resolvedScenes.push({ ...scene, props });
  }

  let audioUrl = null;
  if (audioDriveFileId) {
    const audioPath = path.join(dir, "audio.mp3");
    await downloadFile(audioDriveFileId, audioPath);
    audioUrl = `file://${audioPath}`;
  }

  const outputPath = path.join(dir, "output.mp4");
  await renderSceneVideo({ scenes: resolvedScenes, audioUrl, outputPath, orientation });

  const uploadResult = await uploadFile(outputPath, outputDriveFolderId, "video/mp4");

  jobs.set(jobId, {
    status: "done",
    createdAt: jobs.get(jobId).createdAt,
    result: uploadResult,
  });

  cleanup(jobId); // nothing stays on the VPS after upload
}

app.listen(PORT, () => {
  console.log(`Render server listening on port ${PORT}`);
});
