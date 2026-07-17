import { AbsoluteFill, useCurrentFrame } from "remotion";

// Applied once at the whole-video level (not per-scene) so the grade feels
// consistent across every cut, the way a real color grade would.
export const FilmLook = ({ grain = true, vignette = true, grainOpacity = 0.05 }) => {
  const frame = useCurrentFrame();
  // Cycle through a few pre-baked noise seeds so grain flickers subtly
  // instead of looking like a static, obviously-repeating texture.
  const seed = frame % 6;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "normal" }}>
      {grain ? (
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <filter id={`grain-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${seed})`} opacity={grainOpacity} />
        </svg>
      ) : null}
      {vignette ? (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
        }} />
      ) : null}
    </AbsoluteFill>
  );
};
