import { AbsoluteFill, useCurrentFrame } from "remotion";

// Fills the gap identified in render-capabilities.md §9.3: FilmLook only does
// grain + vignette, nothing approximating the halftone-dot / duotone-ink /
// warm-paper look used by Vox-style documentary edits. This follows the same
// conventions as FilmLook.jsx (AbsoluteFill overlay, seeded SVG filters that
// cycle per-frame so nothing looks like a static repeating texture) so it
// composes cleanly alongside it - both can be layered in the same scene.
//
// Two independent effects, each toggleable on its own:
//
// 1. Halftone dot screen - a tiled, rotated SVG dot pattern blended with
//    "multiply", the classic screen-print/newspaper-ink texture used
//    throughout Vox-style motion graphics.
// 2. Duotone wash - optionally wraps `children` and remaps the actual
//    rendered content to a two-color ink palette (shadow color -> highlight
//    color) via a real grayscale + per-channel remap filter chain, rather
//    than just tinting on top. Pass `children` to use this; omit them to
//    use HalftoneOverlay purely as an overlay (like FilmLook), stacked on
//    top of whatever the scene already rendered.
//
// Paper-fiber grain (rougher, warmer than FilmLook's film grain) is on by
// default alongside the dot screen, since the two together are what actually
// reads as "paper" rather than just "dotted".

function hexToUnitChannel(hex, idx) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  return channels[idx] / 255;
}

export const HalftoneOverlay = ({
  children,
  // Duotone wash - only applied if `children` is passed.
  shadowColor = "#1B1F3B",
  highlightColor = "#FDF6E3",
  // Halftone dot screen
  dots = true,
  dotSize = 3,
  dotSpacing = 10,
  dotColor = "#000000",
  dotOpacity = 0.12,
  dotAngle = 18,
  // Paper-fiber grain (distinct from FilmLook's film grain - rougher, warmer)
  paperGrain = true,
  paperOpacity = 0.06,
  paperTint = "#FBF3E1",
}) => {
  const frame = useCurrentFrame();
  const seed = frame % 6;
  const duotoneId = `halftone-duotone-${seed}`;
  const dotsId = `halftone-dots-${seed}`;
  const paperId = `halftone-paper-${seed}`;

  const hasDuotone = Boolean(children);

  return (
    <>
      {hasDuotone ? (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={duotoneId}>
            {/* Flatten to real perceptual grayscale (standard luminance weights) */}
            <feColorMatrix
              type="matrix"
              result="gray"
              values="
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0
              "
            />
            {/* Remap black->shadowColor, white->highlightColor per channel */}
            <feComponentTransfer in="gray">
              <feFuncR type="table" tableValues={`${hexToUnitChannel(shadowColor, 0)} ${hexToUnitChannel(highlightColor, 0)}`} />
              <feFuncG type="table" tableValues={`${hexToUnitChannel(shadowColor, 1)} ${hexToUnitChannel(highlightColor, 1)}`} />
              <feFuncB type="table" tableValues={`${hexToUnitChannel(shadowColor, 2)} ${hexToUnitChannel(highlightColor, 2)}`} />
            </feComponentTransfer>
          </filter>
        </svg>
      ) : null}

      {hasDuotone ? (
        <AbsoluteFill style={{ filter: `url(#${duotoneId})` }}>{children}</AbsoluteFill>
      ) : (
        children ?? null
      )}

      {dots ? (
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: dotOpacity }}>
          <svg width="100%" height="100%">
            <pattern
              id={dotsId}
              width={dotSpacing}
              height={dotSpacing}
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${dotAngle})`}
            >
              <circle cx={dotSpacing / 2} cy={dotSpacing / 2} r={dotSize / 2} fill={dotColor} />
            </pattern>
            <rect width="100%" height="100%" fill={`url(#${dotsId})`} />
          </svg>
        </AbsoluteFill>
      ) : null}

      {paperGrain ? (
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: paperOpacity }}>
          <svg width="100%" height="100%">
            <filter id={paperId}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.55"
                numOctaves="3"
                seed={seed + 10}
                stitchTiles="stitch"
              />
              <feColorMatrix
                type="matrix"
                values={`
                  0 0 0 0 ${hexToUnitChannel(paperTint, 0)}
                  0 0 0 0 ${hexToUnitChannel(paperTint, 1)}
                  0 0 0 0 ${hexToUnitChannel(paperTint, 2)}
                  0 0 0 0.6 0
                `}
              />
            </filter>
            <rect width="100%" height="100%" filter={`url(#${paperId})`} />
          </svg>
        </AbsoluteFill>
      ) : null}
    </>
  );
};
