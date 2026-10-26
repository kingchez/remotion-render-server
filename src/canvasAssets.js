// Brings user files (logo, photos, data) into an agent-written HTML animation.
// The page cannot reach Google Drive, so the server downloads each file and
// writes it into the page as a data URI under window.ASSETS[name], before the
// page's own scripts run. The agent's code then just does
//   const img = new Image(); img.src = ASSETS.logo;
// (draw it once img.complete / after img.decode(); every frame stays a pure
// function of t).

const TOTAL_CAP = 12 * 1024 * 1024; // keep the page (and Remotion's input props) small
const EXT_MIME = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".json": "application/json",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
};

// assets: [{ name, driveFileId | url }]
// resolveDrive(fileId, k) -> a url the server can fetch (local /tmp-assets or https)
async function loadCanvasAssets({ assets, sceneKey, port, resolveDrive, fetchFn = fetch }) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const map = {};
  let total = 0;
  for (let k = 0; k < assets.length; k++) {
    const a = assets[k] || {};
    if (typeof a.name !== "string" || !/^[\w.-]+$/.test(a.name)) {
      throw new Error(`CanvasAnimation scene ${sceneKey}: asset ${k} needs a simple "name" (letters, digits, _ . -)`);
    }
    let url = a.url;
    if (a.driveFileId) url = await resolveDrive(a.driveFileId, k);
    const local = typeof url === "string" && url.startsWith(`http://127.0.0.1:${port}/tmp-assets/`);
    if (!url || !(local || /^https:\/\//.test(url))) {
      throw new Error(`CanvasAnimation scene ${sceneKey}: asset "${a.name}" needs a driveFileId or an https:// url`);
    }
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`CanvasAnimation scene ${sceneKey}: could not fetch asset "${a.name}" (HTTP ${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    total += buf.length;
    if (total > TOTAL_CAP) {
      throw new Error(`CanvasAnimation scene ${sceneKey}: assets are over ${TOTAL_CAP / 1024 / 1024} MB in total; use smaller images (about 1920 px wide is plenty)`);
    }
    let mime = ((res.headers && res.headers.get && res.headers.get("content-type")) || "").split(";")[0].trim();
    if (!mime || mime === "application/octet-stream") {
      const ext = (new URL(url).pathname.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
      mime = EXT_MIME[ext] || "application/octet-stream";
    }
    map[a.name] = `data:${mime};base64,${buf.toString("base64")}`;
  }
  return map;
}

function injectAssets(html, map) {
  if (!map) return html;
  const tag = `<script>window.ASSETS=${JSON.stringify(map).replace(/</g, "\\u003c")};</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + tag) : tag + html;
}

module.exports = { loadCanvasAssets, injectAssets };
