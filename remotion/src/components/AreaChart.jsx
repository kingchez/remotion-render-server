import { interpolate, useCurrentFrame } from "remotion";

export const AreaChart = ({ title, data, durationInFrames, color = "#4361ee" }) => {
  const frame = useCurrentFrame();
  const chartWidth = 900;
  const chartHeight = 500;
  const padding = 70;
  const maxValue = Math.max(...data.map((d) => d.value));

  const xScale = (i) => (i / (data.length - 1)) * (chartWidth - padding * 2) + padding;
  const yScale = (v) => chartHeight - padding - (v / maxValue) * (chartHeight - padding * 2);

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.value)}`).join(" ");
  const areaPath = linePath +
    ` L ${xScale(data.length - 1)} ${chartHeight - padding} L ${xScale(0)} ${chartHeight - padding} Z`;

  const clipWidth = interpolate(frame, [0, durationInFrames * 0.5], [0, chartWidth - padding * 2], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Arial, sans-serif", background: "linear-gradient(to bottom right, #111827, #1f2937)",
    }}>
      <div style={{ position: "relative", width: chartWidth, height: chartHeight, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 16, padding: 20 }}>
        <svg width={chartWidth} height={chartHeight}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <clipPath id="revealClip">
              <rect x={padding} y={0} width={clipWidth} height={chartHeight} />
            </clipPath>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={padding} y1={yScale(f * maxValue)} x2={chartWidth - padding} y2={yScale(f * maxValue)}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          ))}
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
          {data.map((d, i) => (
            <text key={i} x={xScale(i)} y={chartHeight - padding + 25} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={13} fontWeight={500}>
              {d.label}
            </text>
          ))}
          <path d={areaPath} fill="url(#areaGradient)" clipPath="url(#revealClip)" />
          <path d={linePath} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" clipPath="url(#revealClip)" />
          {data.map((d, i) => {
            const pointStart = (i / data.length) * (durationInFrames * 0.5);
            const pointProgress = interpolate(frame, [pointStart, pointStart + 8], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r={4 * pointProgress} fill="white" stroke={color} strokeWidth={2} opacity={pointProgress} />;
          })}
        </svg>
        {title ? (
          <div style={{ position: "absolute", top: 25, left: "50%", transform: "translateX(-50%)", fontSize: 28, fontWeight: 700, color: "white" }}>
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
};
