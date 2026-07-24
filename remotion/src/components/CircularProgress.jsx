import { interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

export const CircularProgress = ({ label, value, maxValue = 100, unit = "%", durationInFrames, color = "#2E86FF", font = "ui"}) => {
  const frame = useCurrentFrame();
  const radius = 140;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = interpolate(frame, [0, durationInFrames * 0.7], [0, value / maxValue], {
    extrapolateRight: "clamp",
  });
  const displayValue = Math.round(progress * maxValue);

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", backgroundColor: "#0F1115", fontFamily: resolveFont(font),
    }}>
      <svg width={360} height={360}>
        <circle cx={180} cy={180} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={180} cy={180} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 180 180)" />
        <text x={180} y={190} textAnchor="middle" fill="white" fontSize={64} fontWeight="800">
          {displayValue}{unit}
        </text>
      </svg>
      {label ? <div style={{ marginTop: 20, fontSize: 30, color: "white" }}>{label}</div> : null}
    </div>
  );
};
