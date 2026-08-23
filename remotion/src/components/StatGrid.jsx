import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// STAT GRID — a grid of mini-stats for when the speaker rattles off several
// numbers in sequence ("12 routines, 22 skills, 48 edge functions"). Each
// cell pops in at its own appearAtSec so the grid builds WITH the speaker
// rather than appearing all at once. Ported/adapted from a reference
// motion-graphics skill. Distinct from DataViz (one hero number with a
// count-up) and RatioDots (a single X-of-Y proportion) - this is for
// several independent stats shown together.
//
// stats: [{ value, label, delta?, appearAtSec? }]
export const StatGrid = ({
  title,
  stats = [],
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const N = Math.min(6, stats.length);
  const typeBase = Math.min(width, height);
  if (!N) return null;

  const cols = N <= 1 ? 1 : N === 2 ? 2 : N === 3 ? 3 : N === 4 ? 2 : 3;
  const rows = Math.ceil(N / cols);
  const titleBarH = title ? Math.round(height * 0.13) : 0;
  const padX = width * 0.08;
  const gridTop = titleBarH + height * 0.06;
  const gridH = height - gridTop - height * 0.06;
  const cellW = (width - padX * 2) / cols;
  const cellH = gridH / rows;
  const cardW = cellW * 0.86;
  const cardH = Math.min(cellH * 0.8, cardW * 0.75);

  const totalSec = (durationInFrames ?? N * 30) / fps;
  const span = totalSec * 0.55;
  const norm = stats.slice(0, N).map((s, i) => ({ ...s, appearAtSec: typeof s.appearAtSec === "number" ? s.appearAtSec : (span / N) * i }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#101820" }}>
      {title ? (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: titleBarH, display: "flex", alignItems: "center", paddingLeft: padX, fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.04), color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: padX, top: gridTop, width: width - padX * 2, height: gridH, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, alignItems: "center", justifyItems: "center" }}>
        {norm.map((s, i) => {
          const appearF = Math.round(s.appearAtSec * fps);
          if (frame < appearF) return <div key={i} />;
          const spr = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(fps * 0.4), config: { damping: 13, stiffness: 190, mass: 0.6 } });
          const scale = interpolate(spr, [0, 1], [0.7, 1]);
          const isPositiveDelta = s.delta && /^[+↑]/.test(s.delta);
          return (
            <div key={i} style={{
              width: cardW, height: cardH, borderRadius: typeBase * 0.014, background: "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", opacity: spr, transform: `scale(${scale})`,
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            }}>
              <div style={{ fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.05), color: "#0F121A", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.02), color: "#5A6275", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 8 }}>{s.label}</div>
              {s.delta ? <div style={{ fontFamily: resolveFont(font), fontWeight: 700, fontSize: Math.round(typeBase * 0.02), color: isPositiveDelta ? accentColor : "#9AA3AB", marginTop: 4 }}>{s.delta}</div> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
