import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// NODE CULL DIAGRAM — a parent node with N children in a grid, connected by
// curved lines, where each child can progressively appear and then get
// "culled" (dim + red X) or stay "kept" (accent glow). Generalizes two
// closely-related patterns from a reference editing skill into one
// component: an org/system diagram narrowing down to survivors ("of the 12
// routines I built, only 3 are still running") and an agent/character
// roster being reduced ("9 of these got replaced"). Real spring pop-ins
// and a continuous subtle pulse on the parent + kept nodes so the diagram
// never reads as a frozen slide (matches the "living hold" principle -
// nothing in a motion-graphics scene should sit perfectly static).
//
// nodes: [{ label, appearAtSec, dimAtSec?, kept? }]
export const NodeCullDiagram = ({
  title,
  parentLabel = "",
  nodes = [],
  columns = 4,
  accentColor = "#4ADE80",
  neutralColor = "#E6EAF0",
  lineColor = "#5A6275",
  markColor = "#FF4D5E",
  textColor = "#0F121A",
  font = "ui",
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  if (!nodes.length) return null;

  const padX = width * 0.06;
  const titleTop = height * 0.07;
  const titleH = title ? 60 : 0;
  const parentW = width * 0.3;
  const parentH = height * 0.075;
  const parentTop = titleTop + titleH + height * 0.03;
  const parentLeft = (width - parentW) / 2;

  const rows = Math.ceil(nodes.length / columns);
  const gridTop = parentTop + parentH + height * 0.1;
  const gridBottom = height * 0.92;
  const gridH = gridBottom - gridTop;
  const cellW = (width - padX * 2) / columns;
  const cellH = gridH / rows;
  const boxW = cellW * 0.82;
  const boxH = Math.min(cellH * 0.62, height * 0.08);

  const childPos = nodes.map((_, i) => {
    const r = Math.floor(i / columns);
    const c = i % columns;
    const cx = padX + cellW * (c + 0.5);
    const cy = gridTop + cellH * r + boxH / 2 + cellH * 0.1;
    return { cx, cy, left: cx - boxW / 2, top: cy - boxH / 2 };
  });

  const parentCX = parentLeft + parentW / 2;
  const parentBottomY = parentTop + parentH;
  const pulseT = Math.abs(Math.sin((frame / fps) * Math.PI * 1.2));

  return (
    <AbsoluteFill>
      {title ? (
        <div
          style={{
            position: "absolute", top: titleTop, left: 0, right: 0, textAlign: "center",
            fontFamily: resolveFont(font), fontWeight: 800, fontSize: 34, color: "#FFFFFF",
            textTransform: "uppercase", letterSpacing: "0.03em",
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {title}
        </div>
      ) : null}

      {parentLabel ? (
        <div
          style={{
            position: "absolute", left: parentLeft, top: parentTop, width: parentW, height: parentH,
            borderRadius: 14, background: "#1A1D26", color: "#FFFFFF", display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: resolveFont(font), fontWeight: 800,
            fontSize: 26, textTransform: "uppercase", letterSpacing: "0.05em",
            boxShadow: `0 8px 24px rgba(0,0,0,0.25), 0 0 ${20 + 20 * pulseT}px ${accentColor}55`,
            opacity: interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `scale(${1 + 0.015 * pulseT})`,
          }}
        >
          {parentLabel}
        </div>
      ) : null}

      <svg style={{ position: "absolute", left: 0, top: 0, width, height, pointerEvents: "none" }}>
        {childPos.map((p, i) => {
          const appearF = Math.round((nodes[i].appearAtSec ?? 0) * fps);
          const lineProg = interpolate(frame, [appearF - 6, appearF + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const dimF = nodes[i].dimAtSec != null ? Math.round(nodes[i].dimAtSec * fps) : null;
          const dimOp = dimF != null && frame >= dimF
            ? interpolate(frame, [dimF, dimF + 10], [1, 0.18], { extrapolateRight: "clamp" }) : 1;
          const midY = parentBottomY + (p.top - parentBottomY) * 0.55;
          const d = `M ${parentCX} ${parentBottomY} C ${parentCX} ${midY}, ${p.cx} ${midY}, ${p.cx} ${p.top}`;
          return (
            <path key={i} d={d} fill="none" stroke={nodes[i].kept ? accentColor : lineColor}
              strokeWidth={nodes[i].kept ? 3 : 2} strokeOpacity={lineProg * dimOp} strokeLinecap="round" />
          );
        })}
      </svg>

      {nodes.map((n, i) => {
        const p = childPos[i];
        const appearF = Math.round((n.appearAtSec ?? 0) * fps);
        if (frame < appearF) return null;
        const pop = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(0.3 * fps), config: { damping: 14, stiffness: 240, mass: 0.5 } });
        const scale = interpolate(pop, [0, 1], [0.65, 1], { extrapolateRight: "clamp" });
        const opacity = interpolate(pop, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });

        const dimF = n.dimAtSec != null ? Math.round(n.dimAtSec * fps) : null;
        const dimOp = dimF != null && frame >= dimF
          ? interpolate(frame, [dimF, dimF + 10], [1, 0.28], { extrapolateRight: "clamp" }) : 1;
        const showX = dimF != null && frame >= dimF;
        const breath = n.kept && dimF != null && frame >= dimF
          ? 1 + 0.025 * Math.sin(((frame - dimF) / fps) * Math.PI * 1.4) : 1;

        return (
          <div key={i} style={{
            position: "absolute", left: p.left, top: p.top, width: boxW, height: boxH, borderRadius: 10,
            background: n.kept ? accentColor : neutralColor, color: textColor, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: resolveFont(font), fontWeight: 700,
            fontSize: 18, textAlign: "center", padding: "0 6px",
            boxShadow: n.kept ? `0 6px 16px ${accentColor}77` : "0 4px 12px rgba(0,0,0,0.18)",
            opacity: opacity * dimOp, transform: `scale(${scale * breath})`,
          }}>
            {n.label || `Node ${i + 1}`}
            {showX ? (
              <svg width={boxW} height={boxH} style={{ position: "absolute", left: 0, top: 0 }} viewBox={`0 0 ${boxW} ${boxH}`}>
                <line x1={boxW * 0.12} y1={boxH * 0.18} x2={boxW * 0.88} y2={boxH * 0.82} stroke={markColor} strokeWidth={Math.max(3, boxH * 0.1)} strokeLinecap="round" />
                <line x1={boxW * 0.88} y1={boxH * 0.18} x2={boxW * 0.12} y2={boxH * 0.82} stroke={markColor} strokeWidth={Math.max(3, boxH * 0.1)} strokeLinecap="round" />
              </svg>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
