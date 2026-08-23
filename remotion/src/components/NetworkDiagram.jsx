import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// NETWORK DIAGRAM — circular nodes connected by animated, drawn edges.
// Closes a real, previously-flagged gap: the style library had a sequence
// primitive (DataFlowPipes) and a narrowing/culling primitive
// (NodeCullDiagram) but nothing for a genuine RELATIONSHIP/TOPOLOGY shape -
// "the cron triggers the routine, which calls the service, which writes to
// the DB", a system architecture map, a decision tree. Use this whenever
// order doesn't matter but connections do (contrast with the sequence
// recipe, where order is the point).
//
// Layout: if every node has explicit x/y (0..1 fractions of the chart
// area), those are honored; otherwise nodes auto-lay out along a
// horizontal centerline. Edges draw progressively (stroke reveal), get an
// arrowhead on arrival, and can optionally show a traveling "packet" dot
// for a data-flowing look.
//
// nodes: [{ id, label, glyph?, x?, y?, highlight?, appearAtSec? }]
// edges: [{ from, to, label?, flowing?, appearAtSec? }]
export const NetworkDiagram = ({
  title,
  nodes = [],
  edges = [],
  accentColor = "#4ADE80",
  nodeFill = "#1E2434",
  nodeStroke,
  textColor = "#FFFFFF",
  font = "ui",
}) => {
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const N = Math.min(8, nodes.length);
  if (!N) return null;

  const stroke = nodeStroke ?? accentColor;
  const titleBarH = title ? Math.round(height * 0.13) : 0;
  const padX = Math.round(width * 0.1);
  const padY = Math.round(height * (title ? 0.22 : 0.14));
  const padBottom = Math.round(height * 0.14);
  const chartW = width - padX * 2;
  const chartH = height - padY - padBottom;
  const nodeR = Math.round(Math.min(chartW, chartH) * 0.075);

  const hasManualLayout = nodes.slice(0, N).every((n) => typeof n.x === "number" && typeof n.y === "number");
  const positioned = nodes.slice(0, N).map((n, i) => {
    if (hasManualLayout) return { ...n, _x: n.x * chartW, _y: n.y * chartH };
    const xFrac = N === 1 ? 0.5 : i / (N - 1);
    return { ...n, _x: xFrac * chartW, _y: chartH * 0.5 };
  });
  const nodeById = Object.fromEntries(positioned.map((n) => [n.id, n]));

  const totalSec = durationInFrames / fps;
  const span = totalSec * 0.65;
  const norm = positioned.map((n, i) => ({
    ...n,
    appearAtSec: typeof n.appearAtSec === "number" ? n.appearAtSec : (span / Math.max(1, N)) * i,
  }));
  const normEdges = edges.map((e, i) => ({
    ...e,
    appearAtSec: typeof e.appearAtSec === "number" ? e.appearAtSec : (span / Math.max(1, edges.length || 1)) * i + 0.3,
  }));

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {title ? (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: titleBarH,
          display: "flex", alignItems: "center", paddingLeft: Math.round(width * 0.05),
          fontFamily: resolveFont(font), fontWeight: 700, fontSize: 32, color: textColor,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          <span style={{ color: accentColor, marginRight: 14 }}>━</span>
          {title}
        </div>
      ) : null}

      <svg width={chartW} height={chartH} style={{ position: "absolute", left: padX, top: padY, overflow: "visible" }}>
        {normEdges.map((e, i) => {
          const a = nodeById[e.from];
          const b = nodeById[e.to];
          if (!a || !b) return null;
          const dx = b._x - a._x;
          const dy = b._y - a._y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const x1 = a._x + ux * nodeR;
          const y1 = a._y + uy * nodeR;
          const x2 = b._x - ux * nodeR;
          const y2 = b._y - uy * nodeR;
          const tNow = frame / fps;
          const drawProg = interpolate(tNow, [e.appearAtSec, e.appearAtSec + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;

          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * drawProg} y2={y1 + (y2 - y1) * drawProg}
                stroke={accentColor} strokeWidth={3} strokeLinecap="round" />
              {e.flowing && drawProg >= 1 ? (
                <circle
                  cx={x1 + (x2 - x1) * (((tNow - e.appearAtSec - 0.5) * 0.6) % 1)}
                  cy={y1 + (y2 - y1) * (((tNow - e.appearAtSec - 0.5) * 0.6) % 1)}
                  r={Math.max(4, nodeR * 0.12)} fill={accentColor} opacity={0.95}
                />
              ) : null}
              {drawProg >= 1 ? (
                <polygon points={`${x2},${y2} ${x2 - ux * 14 - uy * 7},${y2 - uy * 14 + ux * 7} ${x2 - ux * 14 + uy * 7},${y2 - uy * 14 - ux * 7}`} fill={accentColor} />
              ) : null}
              {e.label && drawProg >= 0.6 ? (
                <g opacity={interpolate(tNow, [e.appearAtSec + 0.3, e.appearAtSec + 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
                  <rect x={mx - e.label.length * 7} y={my - 14} width={e.label.length * 14} height={28} rx={6} fill="rgba(15,18,26,0.9)" />
                  <text x={mx} y={my + 6} fontFamily={resolveFont(font)} fontSize={20} fontWeight={700} fill={accentColor} textAnchor="middle">{e.label}</text>
                </g>
              ) : null}
            </g>
          );
        })}

        {norm.map((n, i) => {
          const itemFrame = Math.round(n.appearAtSec * fps);
          if (frame < itemFrame) return null;
          const enter = spring({ frame: frame - itemFrame, fps, durationInFrames: Math.round(fps * 0.45), config: { damping: 14, stiffness: 130, mass: 0.6 } });
          const scale = interpolate(enter, [0, 1], [0.6, 1]);
          const fill = n.highlight ? accentColor : nodeFill;
          const strokeC = n.highlight ? nodeFill : stroke;

          return (
            <g key={i} opacity={enter} transform={`translate(${n._x},${n._y}) scale(${scale})`}>
              <circle cx={0} cy={0} r={nodeR} fill={fill} stroke={strokeC} strokeWidth={3} />
              {n.glyph ? <text x={0} y={16} fontFamily={resolveFont(font)} fontSize={40} textAnchor="middle" fill={n.highlight ? nodeFill : textColor}>{n.glyph}</text> : null}
              <text x={0} y={nodeR + 30} fontFamily={resolveFont(font)} fontSize={22} fontWeight={700} fill={textColor} textAnchor="middle" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
