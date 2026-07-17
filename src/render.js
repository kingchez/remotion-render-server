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
    });
  }
  return bundleLocationPromise;
}

async function renderSceneVideo({ scenes, audioUrl, outputPath, orientation = "vertical", look }) {
  const serveUrl = await getBundleLocation();

  const inputProps = { scenes, audioUrl: audioUrl || null, orientation, look: look || null };

  const composition = await selectComposition({
    serveUrl,
    id: "SceneVideo",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error("Render finished but output file was not created");
  }

  return outputPath;
}

module.exports = { renderSceneVideo };
