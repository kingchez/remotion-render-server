import { interpolate, useCurrentFrame } from "remotion";

const VBOX_W = 1280;
const VBOX_H = 720;
const MARGIN = 160;

function bezierPath(a, b) {
  const dx = b.x - a.x;
  const handle = Math.max(60, Math.abs(dx) * 0.5);
  return `M ${a.x} ${a.y} C ${a.x + handle} ${a.y}, ${b.x - handle} ${b.y}, ${b.x} ${b.y}`;
}

function bezierLength(a, b) {
  const handle = Math.max(60, Math.abs(b.x - a.x) * 0.5);
  const c1 = { x: a.x + handle, y: a.y };
  const c2 = { x: b.x - handle, y: b.y };
  let len = 0;
  let prev = a;
  const steps = 32;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const p = {
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    };
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

// nodes: [{ id, x, y, label }]  edges: [{ from, to, startFrame }]
// Node coordinates are treated as relative positions only - this component
// auto-fits and centers whatever layout is passed in, so callers don't need
// to hand-tune coordinates to avoid empty/unbalanced space.
export const DataFlowPipes = ({
  nodes, edges, pipeColor = "#2a2a30", pulseColor = "#22d3ee",
  pulseLength = 60, pulseDuration = 36, nodeColor = "#0a0a0a", textColor = "#fafafa",
}) => {
  const frame = useCurrentFrame();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const contentW = Math.max(maxX - minX, 1);
  const contentH = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (VBOX_W - MARGIN * 2) / contentW,
    (VBOX_H - MARGIN * 2) / contentH,
    1.3
  );
  const tx = VBOX_W / 2 - ((minX + maxX) / 2) * scale;
  const ty = VBOX_H / 2 - ((minY + maxY) / 2) * scale;

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#0F1115" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VBOX_W} ${VBOX_H}`} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {edges.map((edge, i) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;
            return (
              <path key={`pipe-${i}`} d={bezierPath(a, b)} fill="none" stroke={pipeColor} strokeWidth={3 / scale} strokeLinecap="round" />
            );
          })}
          {edges.map((edge, i) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;
            const path = bezierPath(a, b);
            const len = bezierLength(a, b);
            const startFrame = edge.startFrame ?? 0;
            const localFrame = frame - startFrame;
            const offset = interpolate(localFrame, [0, pulseDuration], [len + pulseLength, -pulseLength], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            if (localFrame < 0 || localFrame > pulseDuration + 6) return null;
            return (
              <g key={`pulse-${i}`}>
                {[0.15, 0.3, 0.55].map((alpha, idx) => (
                  <path key={idx} d={path} fill="none" stroke={pulseColor} strokeWidth={3 / scale} strokeLinecap="round"
                    strokeDasharray={`${pulseLength} 9999`} strokeDashoffset={offset + (idx + 1) * 8} opacity={alpha} />
                ))}
                <path d={path} fill="none" stroke={pulseColor} strokeWidth={3.5 / scale} strokeLinecap="round"
                  strokeDasharray={`${pulseLength} 9999`} strokeDashoffset={offset} />
              </g>
            );
          })}
          {nodes.map((node) => (
            <g key={node.id}>
              <rect x={node.x - 65} y={node.y - 26} width={130} height={52} rx={10}
                fill={nodeColor} stroke="rgba(255,255,255,0.12)" strokeWidth={1 / scale} />
              <text x={node.x} y={node.y + 6} textAnchor="middle" fill={textColor}
                fontSize={16} fontWeight={600} fontFamily="Arial, sans-serif">
                {node.label ?? node.id}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
