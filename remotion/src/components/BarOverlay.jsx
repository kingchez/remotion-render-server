import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// BAR OVERLAY — a compact bar-chart lower-third OVERLAY (speaker/footage
// stays fully visible), not a full-screen takeover. Ported/adapted from a
// reference motion-graphics skill. For visualizing a small change the
// speaker is describing in real time - costs cut, revenue up, time down -
// without cutting away from whatever's on screen. Cardless: solid bars +
// shadowed labels, same visual family as KineticText's overlay mode and
// CornerStat.
//
// bars: [{ label, value, maxValue?, highlight?, appearAtSec? }]
export const BarOverlay = ({
  bars = [],
  anchor = "bottom-left", // "bottom-left" | "bottom-right"
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const N = Math.min(5, bars.length);
  if (!N) return null;

  const maxVal = Math.max(...bars.slice(0, N).map((b) => b.maxValue ?? b.value), 1);
  const panelW = width * 0.34;
  const barMaxW = panelW * 0.72;
  const rowH = Math.round(typeBase * 0.05);
  const margin = Math.round(typeBase * 0.045);
  const left = anchor === "bottom-right" ? width - panelW - margin : margin;
  const bottom = margin;
  const panelH = rowH * N;
  const top = height - bottom - panelH;

  const totalSec = (durationInFrames ?? N * 25) / fps;
  const span = totalSec * 0.5;
  const norm = bars.slice(0, N).map((b, i) => ({ ...b, appearAtSec: typeof b.appearAtSec === "number" ? b.appearAtSec : (span / N) * i }));

  return (
    <div style={{ position: "absolute", left, top, width: panelW }}>
      {norm.map((b, i) => {
        const appearF = Math.round(b.appearAtSec * fps);
        if (frame < appearF) return null;
        const s = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(fps * 0.5), config: { damping: 16, stiffness: 130, mass: 0.7 } });
        const barW = interpolate(s, [0, 1], [0, barMaxW * (b.value / maxVal)]);
        const labelOpacity = interpolate(frame, [appearF, appearF + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const color = b.highlight ? accentColor : "#8A95B3";

        return (
          <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", gap: typeBase * 0.012 }}>
            <div style={{
              fontFamily: resolveFont(font), fontWeight: 700, fontSize: Math.round(typeBase * 0.018), color: "#FFFFFF",
              width: panelW * 0.24, opacity: labelOpacity, textShadow: "0 2px 6px rgba(0,0,0,0.7)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {b.label}
            </div>
            <div style={{ height: Math.round(rowH * 0.42), width: barW, background: color, borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
            <div style={{ fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.02), color, opacity: labelOpacity, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
              {b.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};
