const path = require("path");
const fs = require("fs");
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");

let bundleLocationPromise = null;

// Bundle the Remotion project once and reuse it for every render
// (bundling is slow; doing it per-request would waste minutes on every job)
function getBundleLocation() {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({
      entryPoint: path.join(__dirname, "..", "remotion", "src", "index.jsx"),
      // Explicit, not inferred: bundle()'s default publicDir resolution is
      // ambiguous between "relative to entryPoint" and "relative to process
      // cwd" depending on Remotion version/context, and our Dockerfile runs
      // `node src/index.js` from /app (repo root), one level above the
      // actual remotion/public folder. Without this, local illustration
      // assets under remotion/public/illustrations/ 404 at render time
      // (confirmed: "Error loading image with src: http://localhost:PORT/
      // illustrations/...") even though the files exist in the repo.
      publicDir: path.join(__dirname, "..", "remotion", "public"),
    });
  }
  return bundleLocationPromise;
}

// Encoding quality. Remotion's h264 default is CRF 18 (near-visually-lossless),
// which produces very large files on long videos - a ~7 min 1080x1920 render
// came out at ~403 MB. CRF 22 is visually clean for screen-recording/product
// footage + text overlays at roughly half the size. Lower = bigger/better.
// Override globally with RENDER_CRF / RENDER_X264_PRESET env vars, or per job
// with a `crf` field in the render request (clamped to 16-28).
const DEFAULT_CRF = Number(process.env.RENDER_CRF) || 22;
const DEFAULT_X264_PRESET = process.env.RENDER_X264_PRESET || "medium";

function resolveCrf(crf) {
  const n = Number(crf);
  if (!Number.isFinite(n)) return DEFAULT_CRF;
  return Math.min(28, Math.max(16, Math.round(n)));
}

async function renderSceneVideo({ scenes, audioUrl, outputPath, orientation = "vertical", look, music, crf }) {
  const serveUrl = await getBundleLocation();

  const inputProps = { scenes, audioUrl: audioUrl || null, orientation, look: look || null, music: music || null };

  const composition = await selectComposition({
    serveUrl,
    id: "SceneVideo",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: resolveCrf(crf),
    x264Preset: DEFAULT_X264_PRESET,
    pixelFormat: "yuv420p",
    audioBitrate: "192k",
    outputLocation: outputPath,
    inputProps,
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error("Render finished but output file was not created");
  }

  return outputPath;
}

module.exports = { renderSceneVideo };
