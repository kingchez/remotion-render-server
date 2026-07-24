import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

// Renders a row of labeled circles connected by arrows, appearing one at a
// time - good for "here's how the workflow flows" explainer diagrams.
export const MotionGraphic = ({ items, durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const perItem = durationInFrames / items.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#101820", justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {items.map((item, i) => {
          const itemStart = i * perItem;
          const appear = interpolate(frame, [itemStart, itemStart + 12], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                opacity: appear, transform: `scale(${appear})`,
                width: 140, height: 140, borderRadius: "50%",
                background: "#2E86FF", display: "flex", alignItems: "center",
                justifyContent: "center", color: "white", fontSize: 26,
                fontWeight: 700, fontFamily: resolveFont(font), textAlign: "center", padding: 10,
              }}>
                {item.label}
              </div>
              {i < items.length - 1 ? (
                <div style={{
                  opacity: appear, width: 60, height: 6, background: "#7FB2FF", margin: "0 12px",
                }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
