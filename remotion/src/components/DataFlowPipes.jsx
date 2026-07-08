import { interpolate, useCurrentFrame } from "remotion";

// nodes: [{ id, x, y, label }]  edges: [{ from, to, startFrame }]
// Animated glowing pulses travel along curved pipes between nodes - perfect
// for visualizing an n8n workflow's node-to-node data flow.
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

export const DataFlowPipes = ({
  nodes, edges, pipeColor = "#1f1f23", pulseColor = "#22d3ee",
  pulseLength = 60, pulseDuration = 36, nodeColor = "#0a0a0a", textColor = "#fafafa",
}) => {
  const frame = useCurrentFrame();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#0F1115", fontFamily: "Arial, sans-serif" }}>
      <svg width="100%" height="100%" viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0 }}>
        {edges.map((edge, i) => {
          const a = nodeMap.get(edge.from);
          const b = nodeMap.get(edge.to);
          if (!a || !b) return null;
          return (
            <path key={`pipe-${i}`} d={bezierPath(a, b)} fill="none" stroke={pipeColor} strokeWidth={3} strokeLinecap="round" />
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
                <path key={idx} d={path} fill="none" stroke={pulseColor} strokeWidth={3} strokeLinecap="round"
                  strokeDasharray={`${pulseLength} 9999`} strokeDashoffset={offset + (idx + 1) * 8} opacity={alpha} />
              ))}
              <path d={path} fill="none" stroke={pulseColor} strokeWidth={3.5} strokeLinecap="round"
                strokeDasharray={`${pulseLength} 9999`} strokeDashoffset={offset}
                style={{ filter: `drop-shadow(0 0 8px ${pulseColor})` }} />
            </g>
          );
        })}
      </svg>
      {nodes.map((node) => (
        <div key={node.id} style={{
          position: "absolute", left: node.x - 60, top: node.y - 24, width: 120, height: 48,
          display: "flex", alignItems: "center", justifyContent: "center", background: nodeColor,
          color: textColor, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
          fontSize: 14, fontWeight: 600, boxShadow: "0 12px 30px rgba(0,0,0,0.4)", textAlign: "center", padding: 6,
        }}>
          {node.label ?? node.id}
        </div>
      ))}
    </div>
  );
};
