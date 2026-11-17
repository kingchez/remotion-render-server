import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadDancingScript } from "@remotion/google-fonts/DancingScript";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadBodoniModa } from "@remotion/google-fonts/BodoniModa";

const inter = loadInter();
const poppins = loadPoppins("normal", { weights: ["400", "600", "700"] });
const anton = loadAnton();
const script = loadDancingScript();
const lora = loadLora("normal", { weights: ["400", "600", "700"] });
const condensed = loadBarlowCondensed("normal", { weights: ["600", "800"] });
const plexMono = loadPlexMono("normal", { weights: ["500"] });
const editorial = loadBodoniModa("normal", { weights: ["400", "600", "700"] });

export const FONT_PRESETS = {
  body: inter.fontFamily,
  ui: poppins.fontFamily,
  display: anton.fontFamily,
  script: script.fontFamily,
  serif: lora.fontFamily,
  condensed: condensed.fontFamily,
  mono: plexMono.fontFamily,
  editorial: editorial.fontFamily,
};

export function resolveFont(font) {
  return FONT_PRESETS[font] ?? font;
}
