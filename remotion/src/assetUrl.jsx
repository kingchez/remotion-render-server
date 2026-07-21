// Local static assets (e.g. "illustrations/doodles/coffee-doodle.svg")
// need a "/public/" prefix at render time - NOT because that's the
// documented convention (staticFile() and Remotion Studio's preview both
// serve public/ contents at the site root, no prefix needed), but
// because @remotion/renderer's actual renderMedia() static server
// (serve-handler, serving the bundle dir literally) does not replicate
// that remapping, while bundle()'s publicDir copy physically nests
// everything one level deeper at <bundleDir>/public/. Confirmed by
// directly testing serveStatic(): a bare "/illustrations/..." request
// 404s, "/public/illustrations/..." returns 200, against the same real
// bundle output.
//
// Scene JSON / the illustration manifest intentionally stay written as
// "illustrations/..." (no prefix) - this is the one place that gap gets
// closed, so scene authors never need to know about this bundler/
// render-server quirk. Anything already a full URL (http(s):, file:,
// data:) or already "/public/..." passes through unchanged.
export function normalizeAssetUrl(url) {
  if (!url) return url;
  if (/^(https?:|file:|data:)/i.test(url)) return url;
  if (url.startsWith("/public/")) return url;
  return `/public/${url.replace(/^\/?/, "")}`;
}
