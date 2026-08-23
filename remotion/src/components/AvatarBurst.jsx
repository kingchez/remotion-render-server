import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";
import { normalizeAssetUrl } from "../assetUrl";

// AVATAR BURST — small thumbs (people's portraits OR tool/brand logos) in
// deterministic scattered slots, each landing at its own appearAtSec.
// Ported/adapted from a reference motion-graphics skill, which had this as
// two separate near-identical components (portrait_burst circular for
// people, tool_logo_burst rounded-square for logos) - generalized here
// into one component with a `shape` prop, since the only real difference
// was circle vs rounded-square framing.
//
// Use when the speaker references real named people (drop a face thumb at
// the moment they're named) or names specific tools/products in sequence
// (drop a logo thumb at that moment) - attaches the claim to something
// concrete rather than staying abstract. DETERMINISTIC slot positions
// (seeded by item index) so the same item list always lands in the same
// visual arrangement across renders.
//
// items: [{ imageUrl (or imageDriveFileId), label?, appearAtSec? }]
export const AvatarBurst = ({
  items = [],
  shape = "circle", // "circle" (people) | "tile" (logos/brands)
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const N = Math.min(6, items.length);
  if (!N) return null;

  const size = Math.round(typeBase * 0.13);
  const totalSec = (durationInFrames ?? N * 25) / fps;
  const span = totalSec * 0.65;

  // Deterministic pseudo-random slot layout, seeded purely by index - same
  // input list always produces the same arrangement.
  const seededRand = (seed) => {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const slots = Array.from({ length: N }).map((_, i) => {
    const cols = N <= 3 ? N : Math.ceil(Math.sqrt(N * 1.4));
    const rows = Math.ceil(N / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = (width * 0.7) / cols;
    const cellH = (height * 0.5) / rows;
    const jitterX = (seededRand(i * 2.1) - 0.5) * cellW * 0.3;
    const jitterY = (seededRand(i * 3.7) - 0.5) * cellH * 0.3;
    return {
      x: width * 0.15 + cellW * (col + 0.5) + jitterX,
      y: height * 0.28 + cellH * (row + 0.5) + jitterY,
    };
  });

  const norm = items.slice(0, N).map((it, i) => ({ ...it, appearAtSec: typeof it.appearAtSec === "number" ? it.appearAtSec : (span / N) * i }));

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {norm.map((it, i) => {
        const appearF = Math.round(it.appearAtSec * fps);
        if (frame < appearF) return null;
        const s = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(fps * 0.45), config: { damping: 12, stiffness: 190, mass: 0.6 } });
        const scale = interpolate(s, [0, 1], [0.4, 1]);
        const src = it.imageUrl ? normalizeAssetUrl(it.imageUrl) : null;
        const pos = slots[i];

        return (
          <div key={i} style={{
            position: "absolute", left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size + (it.label ? typeBase * 0.03 : 0),
            opacity: s, transform: `scale(${scale})`, textAlign: "center",
          }}>
            <div style={{
              width: size, height: size, borderRadius: shape === "circle" ? "50%" : typeBase * 0.02,
              overflow: "hidden", background: "#1E2434", border: `2px solid ${accentColor}`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 16px ${accentColor}33`,
            }}>
              {src ? <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
            {it.label ? (
              <div style={{ fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.016), color: "#C7CDD9", marginTop: 4, textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
                {it.label}
              </div>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
