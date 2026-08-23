import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// COMPARISON GRID — a multi-column feature comparison table (2-4 columns,
// 2-6 feature rows). Ported/adapted from a reference motion-graphics
// skill. Distinct from SplitCompare (which needs two real photo/video
// panels) - this is for an abstract, structured "here's how the options
// stack up on N criteria" comparison, boolean or text cells, one column
// optionally marked as the winner.
//
// columns: [{ label, winner?, appearAtSec? }]
// rows: [{ feature, values: [bool|string, ...], appearAtSec? }]
export const ComparisonGrid = ({
  title,
  columns = [],
  rows = [],
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const cols = Math.min(4, columns.length);
  const rowCount = Math.min(6, rows.length);
  if (!cols || !rowCount) return null;

  const titleBarH = title ? Math.round(height * 0.11) : 0;
  const padX = width * 0.06;
  const tableTop = titleBarH + height * 0.05;
  const headerH = height * 0.09;
  const rowH = (height - tableTop - headerH - height * 0.05) / rowCount;
  const featureColW = (width - padX * 2) * 0.28;
  const colW = ((width - padX * 2) - featureColW) / cols;

  const totalSec = (durationInFrames ?? (cols + rowCount) * 20) / fps;
  const colNorm = columns.slice(0, cols).map((c, i) => ({ ...c, appearAtSec: typeof c.appearAtSec === "number" ? c.appearAtSec : (totalSec * 0.25 / cols) * i }));
  const rowNorm = rows.slice(0, rowCount).map((r, i) => ({ ...r, appearAtSec: typeof r.appearAtSec === "number" ? r.appearAtSec : totalSec * 0.3 + (totalSec * 0.5 / rowCount) * i }));

  const renderCell = (val) => {
    if (typeof val === "boolean") {
      return val ? (
        <svg width={typeBase * 0.024} height={typeBase * 0.024} viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={accentColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg width={typeBase * 0.02} height={typeBase * 0.02} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#5A6275" strokeWidth={3} strokeLinecap="round" /></svg>
      );
    }
    return <span style={{ fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.02), color: "#E6EBF4" }}>{val}</span>;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F121A" }}>
      {title ? (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: titleBarH, display: "flex", alignItems: "center", paddingLeft: padX, fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.038), color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </div>
      ) : null}

      <div style={{ position: "absolute", left: padX, top: tableTop, width: featureColW + colW * cols, height: headerH, display: "flex" }}>
        <div style={{ width: featureColW }} />
        {colNorm.map((c, i) => {
          const appearF = Math.round(c.appearAtSec * fps);
          const s = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(fps * 0.35), config: { damping: 14, stiffness: 190, mass: 0.6 } });
          return (
            <div key={i} style={{
              width: colW, display: "flex", alignItems: "center", justifyContent: "center",
              opacity: frame >= appearF ? s : 0, transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
              background: c.winner ? accentColor : "transparent", borderRadius: c.winner ? typeBase * 0.012 : 0,
              margin: c.winner ? "0 4px" : 0,
            }}>
              <span style={{ fontFamily: resolveFont(font), fontWeight: 700, fontSize: Math.round(typeBase * 0.022), color: c.winner ? "#0F121A" : "#C7CDD9", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>

      {rowNorm.map((r, ri) => {
        const appearF = Math.round(r.appearAtSec * fps);
        const rowK = interpolate(frame, [appearF, appearF + Math.round(fps * 0.35)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const y = tableTop + headerH + rowH * ri;
        return (
          <div key={ri} style={{
            position: "absolute", left: padX, top: y, width: featureColW + colW * cols, height: rowH,
            display: "flex", alignItems: "center", opacity: rowK, transform: `translateY(${(1 - rowK) * 10}px)`,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ width: featureColW, fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.02), color: "#C7CDD9" }}>
              {r.feature}
            </div>
            {r.values.slice(0, cols).map((v, ci) => (
              <div key={ci} style={{ width: colW, display: "flex", justifyContent: "center" }}>{renderCell(v)}</div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
