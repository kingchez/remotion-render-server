const fs = require("fs");
const path = require("path");

const LUCIDE_DIR = path.join(__dirname, "..", "node_modules", "lucide-static", "icons");
const SIMPLE_ICONS_DIR = path.join(__dirname, "..", "node_modules", "simple-icons", "icons");

// Looks up an icon by { library, name } and returns normalized SVG markup
// (as a string) that responds to a CSS `color` via currentColor, regardless
// of which library it came from. Lucide icons already use currentColor for
// stroke; Simple Icons brand logos don't set fill at all (default black),
// so we inject fill="currentColor" at the root for consistent behavior.
function resolveIconSvg({ library, name }) {
  if (!library || !name) return null;

  const dir = library === "lucide" ? LUCIDE_DIR : library === "simple-icons" ? SIMPLE_ICONS_DIR : null;
  if (!dir) {
    throw new Error(`Unknown icon library "${library}" - must be "lucide" or "simple-icons"`);
  }

  const filePath = path.join(dir, `${name}.svg`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Icon "${name}" not found in ${library}`);
  }

  let svg = fs.readFileSync(filePath, "utf8");

  // Strip any hardcoded width/height (lucide sets width="24" height="24")
  // so the icon fills whatever size its wrapping container specifies,
  // instead of always rendering at a fixed native size.
  svg = svg.replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "");
  svg = svg.replace("<svg", '<svg width="100%" height="100%"');

  if (!svg.includes("fill=")) {
    svg = svg.replace("<svg", '<svg fill="currentColor"');
  }

  return svg;
}

module.exports = { resolveIconSvg };
