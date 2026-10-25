// Makes an agent-written HTML animation independent of the network at render
// time. The pages load their typefaces from Google Fonts (<link> or @import);
// here, once per job, those stylesheets and the font files they point to are
// downloaded and written into the page itself as @font-face data URIs, so
// every render tab draws the exact same fonts with no outbound request, and a
// slow or blocked Google never silently swaps in a plain font.
//
// Only the latin and latin-ext slices are kept when a family is split by
// script (that is all English text needs, and it keeps the page small).
// Anything that fails to download is left exactly as it was: the page then
// behaves as before.

const CSS_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cssCache = new Map(); // stylesheet url -> inlined css text
const fileCache = new Map(); // font file url -> data uri

const STYLESHEET_URL = /https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s)<>]+/g;

async function toDataUri(url, fetchFn) {
  if (fileCache.has(url)) return fileCache.get(url);
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`font file HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = url.endsWith(".woff2") ? "font/woff2" : url.endsWith(".woff") ? "font/woff" : "font/ttf";
  const uri = `data:${mime};base64,${buf.toString("base64")}`;
  fileCache.set(url, uri);
  return uri;
}

async function inlineStylesheet(url, fetchFn) {
  if (cssCache.has(url)) return cssCache.get(url);
  const res = await fetchFn(url, { headers: { "User-Agent": CSS_USER_AGENT } });
  if (!res.ok) throw new Error(`stylesheet HTTP ${res.status}`);
  let css = await res.text();

  // Google splits a family into one @font-face per script, each preceded by a
  // comment such as /* latin */. Keep latin + latin-ext when those exist.
  const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/\s*@font-face)/);
  const labelled = blocks.filter((b) => /^\/\*\s*[\w-]+\s*\*\//.test(b));
  if (labelled.length > 1) {
    const keep = labelled.filter((b) => /^\/\*\s*latin(-ext)?\s*\*\//.test(b));
    if (keep.length) css = keep.join("\n");
  }

  const fileUrls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])];
  for (const fileUrl of fileUrls) {
    css = css.split(fileUrl).join(await toDataUri(fileUrl, fetchFn));
  }
  cssCache.set(url, css);
  return css;
}

async function inlineGoogleFonts(html, { fetchFn = fetch, log = console } = {}) {
  const urls = [...new Set((html.match(STYLESHEET_URL) || []).map((u) => u.replace(/&amp;/g, "&")))];
  let out = html;
  for (const url of urls) {
    try {
      const css = await inlineStylesheet(url, fetchFn);
      const escaped = url
        .split("&")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"))
        .join("(?:&amp;|&)");
      // <link ... href="url" ...>  ->  <style>css</style>
      out = out.replace(new RegExp(`<link[^>]*${escaped}[^>]*>`, "gi"), () => `<style>${css}</style>`);
      // @import url(url);  or  @import "url";
      out = out.replace(new RegExp(`@import\\s+(?:url\\()?['"]?${escaped}['"]?\\)?\\s*;?`, "gi"), () => css);
    } catch (err) {
      log.warn(`Could not inline Google Fonts stylesheet (${err.message}); leaving the page's own link in place.`);
    }
  }
  return out;
}

module.exports = { inlineGoogleFonts };
