import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// RATIO DOTS — "X out of Y" visualization. Drop this in whenever the script
// states a ratio ("9 of 12 failed", "3 of 11 worked", "65 of 100 prefer X").
// Y dots appear in a grid, then at `markAtSec` exactly X of them flip to the
// opposite state - the viewer reads the proportion instantly, no chart axes
// to parse. Real spring-based pop-in per dot (not a linear/eased tween) -
// `spring` is part of the core `remotion` package already in this repo's
// dependencies, confirmed directly against the installed 4.0.286 tarball.
//
// `polarity` controls which color reads as "the marked group":
//   "negative" - dots start in `positiveColor` (e.g. all alive/kept). At
//                markAtSec, the first `marked` dots fade to `dimColor` + a
//                red X - these are being SUBTRACTED. Use when `marked` is
//                the bad number ("9 of 12 FAILED").
//   "positive" - dots start dim. At markAtSec, the first `marked` dots
//                light up to `positiveColor` - these are the winners. Use
//                when `marked` is the good number ("3 of 12 STILL WORKING").
export const RatioDots = ({
  total,
  marked,
  polarity = "negative",
  caption,
  appearAtSec = 0,
  markAtSec,
  columns,
  vertical = 0.55, // 0..1 vertical anchor of the grid's center
  positiveColor = "#4ADE80",
  dimColor = "rgba(180,180,190,0.35)",
  markColor = "#FF4D5E", // the "X" stroke color on subtracted dots
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  if (!total || total <= 0) return null;

  const M = Math.max(0, Math.min(total, Math.round(marked ?? 0)));
  const cols = columns && columns > 0 ? columns : Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / cols);
  const gridW = Math.round(width * 0.6);
  const dotSpacing = gridW / cols;
  const dotSize = Math.round(dotSpacing * 0.5);
  const gridH = rows * dotSpacing;
  const gridLeft = Math.round((width - gridW) / 2);
  const cy = Math.round(height * Math.max(0.3, Math.min(0.78, vertical)));
  const gridTop = cy - Math.round(gridH / 2);

  const appearF = Math.round(appearAtSec * fps);
  const markF = markAtSec != null ? Math.max(appearF, Math.round(markAtSec * fps)) : null;

  const startColor = polarity === "negative" ? positiveColor : dimColor;
  const flippedColor = polarity === "negative" ? dimColor : positiveColor;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {caption ? (
        <div
          style={{
            position: "absolute",
            top: gridTop - 60,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: resolveFont(font),
            fontWeight: 800,
            fontSize: 32,
            color: "#FFFFFF",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {caption}
        </div>
      ) : null}
      {Array.from({ length: total }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const lastRowCount = total - cols * (rows - 1);
        const xOffset = r === rows - 1 && lastRowCount < cols ? ((cols - lastRowCount) * dotSpacing) / 2 : 0;
        const dotCX = gridLeft + xOffset + c * dotSpacing + dotSpacing / 2;
        const dotCY = gridTop + r * dotSpacing + dotSpacing / 2;

        const dotAppearF = appearF + i * 3; // small per-dot stagger
        if (frame < dotAppearF) return null;

        const pop = spring({
          frame: frame - dotAppearF,
          fps,
          durationInFrames: Math.round(0.3 * fps),
          config: { damping: 14, stiffness: 240, mass: 0.5 },
        });
        const scale = interpolate(pop, [0, 1], [0.4, 1], { extrapolateRight: "clamp" });
        const opacity = interpolate(pop, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });

        const isMarked = i < M;
        let color = startColor;
        let showX = false;
        if (markF != null && isMarked && frame >= markF) {
          const t = interpolate(frame, [markF, markF + 10], [0, 1], { extrapolateRight: "clamp" });
          color = flippedColor;
          showX = polarity === "negative" && t > 0.5;
        }

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: dotCX - dotSize / 2,
              top: dotCY - dotSize / 2,
              width: dotSize,
              height: dotSize,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: color }} />
            {showX ? (
              <svg width={dotSize} height={dotSize} style={{ position: "absolute", left: 0, top: 0 }} viewBox="0 0 100 100">
                <line x1="22" y1="22" x2="78" y2="78" stroke={markColor} strokeWidth="14" strokeLinecap="round" />
                <line x1="78" y1="22" x2="22" y2="78" stroke={markColor} strokeWidth="14" strokeLinecap="round" />
              </svg>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
