import { interpolate, useCurrentFrame } from "remotion";

// segments: [{ label: "Completed", value: 40, color: "#4361ee" }, ...]
export const DonutChart = ({ title, segments, centerLabel, durationInFrames }) => {
  const frame = useCurrentFrame();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = 300;
  const cy = 230;
  const radius = 120;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const centerValue = Math.round(
    interpolate(frame, [10, durationInFrames * 0.5], [0, 100], {
      extrapolateRight: "clamp", extrapolateLeft: "clamp",
    })
  );

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Arial, sans-serif", background: "linear-gradient(to bottom right, #111827, #1f2937)",
    }}>
      <div style={{ position: "relative", width: 600, height: 520, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 16, padding: 20 }}>
        {title ? (
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", fontSize: 28, fontWeight: 700, color: "white" }}>
            {title}
          </div>
        ) : null}
        <svg width={600} height={460} style={{ marginTop: 10 }}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          {segments.map((segment, i) => {
            const segmentLength = (segment.value / total) * circumference;
            const currentOffset = cumulativeOffset;
            cumulativeOffset += segmentLength;
            const segStart = i * (durationInFrames * 0.08);
            const segmentProgress = interpolate(frame, [segStart, segStart + (durationInFrames * 0.15)], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            const animatedLength = segmentLength * segmentProgress;
            return (
              <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={segment.color} strokeWidth={strokeWidth}
                strokeLinecap="round" strokeDasharray={`${animatedLength} ${circumference - animatedLength}`}
                strokeDashoffset={-currentOffset} transform={`rotate(-90 ${cx} ${cy})`} />
            );
          })}
          <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={48} fontWeight="bold">
            {centerValue}%
          </text>
          {centerLabel ? (
            <text x={cx} y={cy + 30} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize={16}>
              {centerLabel}
            </text>
          ) : null}
        </svg>
        <div style={{ position: "absolute", bottom: 25, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {segments.map((segment, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: segment.color }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{segment.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
