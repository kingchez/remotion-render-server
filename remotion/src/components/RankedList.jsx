import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const RankedList = ({ title, items, durationInFrames }) => {
  const frame = useCurrentFrame();
  const perItem = (durationInFrames * 0.8) / items.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F1115", padding: 100 }}>
      {title ? (
        <div style={{ fontSize: 46, fontWeight: 800, color: "white", fontFamily: "Arial, sans-serif", marginBottom: 30 }}>
          {title}
        </div>
      ) : null}
      {items.map((item, i) => {
        const start = i * perItem;
        const opacity = interpolate(frame, [start, start + 10], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const x = interpolate(frame, [start, start + 10], [-40, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{
            opacity, transform: `translateX(${x}px)`, display: "flex", alignItems: "center",
            marginBottom: 20,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 8, background: "#2E86FF", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, fontWeight: 800, fontFamily: "Arial, sans-serif", marginRight: 24,
            }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 34, color: "white", fontFamily: "Arial, sans-serif" }}>
              {item}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
