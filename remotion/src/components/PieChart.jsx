import { interpolate, useCurrentFrame } from "remotion";

export const PieChart = ({ title, segments, durationInFrames }) => {
  const frame = useCurrentFrame();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = 300;
  const cy = 220;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;
  const perSegmentFrames = durationInFrames * 0.06;

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
        <svg width={600} height={440} style={{ marginTop: 10 }}>
          {segments.map((segment, i) => {
            const segmentLength = (segment.value / total) * circumference;
            const currentOffset = cumulativeOffset;
            cumulativeOffset += segmentLength;
            const segStart = i * perSegmentFrames;
            const segmentProgress = interpolate(frame, [segStart, segStart + perSegmentFrames * 1.5], [0, 1], {
              extrapolateRight: "clamp", extrapolateLeft: "clamp",
            });
            const animatedLength = segmentLength * segmentProgress;
            return (
              <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={segment.color} strokeWidth={80}
                strokeDasharray={`${animatedLength} ${circumference - animatedLength}`} strokeDashoffset={-currentOffset}
                transform={`rotate(-90 ${cx} ${cy})`} />
            );
          })}
          <circle cx={cx} cy={cy} r={60} fill="#111827" />
        </svg>
        <div style={{ position: "absolute", bottom: 25, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {segments.map((segment, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: segment.color }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{segment.label} ({segment.value}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
