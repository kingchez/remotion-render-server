import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadDancingScript } from "@remotion/google-fonts/DancingScript";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";

// A small curated set covering the font roles that came up repeatedly in
// the "viral edit" style research: a clean body/UI font, a bold display
// font for headlines, and a script font for accent words. Previously
// nothing in this repo loaded any font at all - Text just took a raw CSS
// font-family string, which on the actual render machine (no SF Pro, no
// Cool Vetica installed) silently fell back to a generic system sans-serif,
// quietly breaking the "designed" look most of these styles depend on.
//
// "serif" (Lora) was added specifically so QuoteCard's original Georgia-serif,
// literary-quote look survives being migrated onto the loaded-font system -
// without it, QuoteCard would have had to fall back to "body" (Inter) and
// lose the serif character that its design actually depends on.
//
// loadFont() registers the @font-face and returns the exact fontFamily
// string Chromium needs to actually use the loaded font during render.
const inter = loadInter();
const poppins = loadPoppins("normal", { weights: ["400", "600", "700"] });
const anton = loadAnton();
const script = loadDancingScript();
const lora = loadLora("normal", { weights: ["400", "600", "700"] });

export const FONT_PRESETS = {
  body: inter.fontFamily,
  ui: poppins.fontFamily,
  display: anton.fontFamily,
  script: script.fontFamily,
  serif: lora.fontFamily,
};

// Resolves a `font` prop that's either one of the curated preset names
// above, or an arbitrary CSS font-family string - so existing scenes that
// already pass something like "Arial, sans-serif" keep working exactly as
// before. Only the four preset names get an actually-loaded, guaranteed
// font; anything else is passed through unchanged (best-effort, same as
// today's behavior).
export function resolveFont(font) {
  return FONT_PRESETS[font] ?? font;
}
