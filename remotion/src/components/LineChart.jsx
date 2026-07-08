import { interpolate, useCurrentFrame } from "remotion";

// data: [{ label: "Jan", value: 25 }, ...]
export const LineChart = ({ title, data, durationInFrames, color = "#4361ee" }) => {
  const frame = useCurrentFrame();
  const chartWidth = 900;
  const chartHeight = 500;
  const padding = 70;
  const maxValue = Math.max(...data.map((d) => d.value));

  const xScale = (i) => (i / (data.length - 1)) * (chartWidth - padding * 2) + padding;
  const yScale = (v) => chartHeight - padding - (v / maxValue) * (chartHeight - padding * 2);

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(" ");

  let totalLength = 0;
  for (let i = 1; i < data.length; i++) {
    const dx = xScale(i) - xScale(i - 1);
    const dy = yScale(data[i].value) - yScale(data[i - 1].value);
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const drawEnd = durationInFrames * 0.6;
  const dashOffset = interpolate(frame, [0, drawEnd], [totalLength, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Arial, sans-serif", background: "linear-gradient(to bottom right, #111827, #1f2937)",
    }}>
      <div style={{
        position: "relative", width: chartWidth, height: chartHeight,
        backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 16, padding: 20,
      }}>
        <svg width={chartWidth} height={chartHeight}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={padding} y1={yScale(f * maxValue)} x2={chartWidth - padding} y2={yScale(f * maxValue)}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          ))}
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding}
            stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
          {data.map((d, i) => (
            <text key={i} x={xScale(i)} y={chartHeight - padding + 25} textAnchor="middle"
              fill="rgba(255,255,255,0.8)" fontSize={13} fontWeight={500}>
              {d.label}
            </text>
          ))}
          <polyline points={points} fill="none" stroke={color} strokeWidth={3}
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={totalLength} strokeDashoffset={dashOffset} />
          {data.map((d, i) => {
            const pointStart = (i / data.length) * drawEnd;
            const pointProgress = interpolate(frame, [pointStart, pointStart + 8], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r={5 * pointProgress}
                fill="#f72585" stroke="white" strokeWidth={2} opacity={pointProgress} />
            );
          })}
        </svg>
        {title ? (
          <div style={{
            position: "absolute", top: 25, left: "50%", transform: "translateX(-50%)",
            fontSize: 28, fontWeight: 700, color: "white",
          }}>
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
};
