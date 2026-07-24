import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

export const DataViz = ({ label, value, maxValue, unit = "", durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames * 0.7], [0, 1], {
    extrapolateRight: "clamp",
  });
  const displayValue = Math.round(progress * value);
  const barWidthPct = (value / maxValue) * 100 * progress;

  return (
    <AbsoluteFill style={{ backgroundColor: "#101820", justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", width: "70%" }}>
        <div style={{ fontSize: 100, fontWeight: 800, color: "#2E86FF", fontFamily: resolveFont(font) }}>
          {displayValue}{unit}
        </div>
        <div style={{ height: 24, background: "#2A3040", borderRadius: 12, marginTop: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${barWidthPct}%`, background: "#2E86FF" }} />
        </div>
        <div style={{ marginTop: 20, fontSize: 34, color: "white", fontFamily: resolveFont(font) }}>
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
