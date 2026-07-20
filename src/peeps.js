const { createAvatar } = require("@dicebear/core");
const { openPeeps } = require("@dicebear/collection");

// Open Peeps (Pablo Stanley, CC0 1.0) via DiceBear's official npm port.
// Unlike the illustrations in remotion/public/illustrations/, these aren't
// static files - DiceBear generates a full SVG character on the fly from
// any seed string, with hair/pose/expression/accessory combinations.
// Same seed always produces the same character (deterministic), so a
// scene can reuse "narrator" or "customer-1" as a stable seed across shots.
//
// options reference (all optional): https://www.dicebear.com/styles/open-peeps/
function resolvePeepSvg({ seed, options = {} }) {
  if (!seed) throw new Error("resolvePeepSvg requires a seed string");

  const avatar = createAvatar(openPeeps, { seed, ...options });
  return avatar.toString();
}

module.exports = { resolvePeepSvg };
