import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

// series: [{ label: "USA", values: [20, 21, 23, 25, 26] }, ...]
// years:  ["2018", "2019", "2020", "2021", "2022"]  <- must align with values[] length
// Renders horizontal bars that smoothly grow and reorder as the timeline
// moves through the years, with a big year counter in the corner.
export const BarChartRace = ({ title, years, series, unit = "", durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const numSegments = years.length - 1;

  // Map current frame -> a continuous position along the years timeline
  const timePos = interpolate(frame, [0, durationInFrames], [0, numSegments], {
    extrapolateRight: "clamp",
  });
  const segmentIndex = Math.min(Math.floor(timePos), numSegments - 1);
  const localT = timePos - segmentIndex;

  const currentYearLabel = years[Math.round(timePos)] || years[years.length - 1];

  const withCurrentValues = series.map((s) => {
    const v1 = s.values[segmentIndex];
    const v2 = s.values[segmentIndex + 1] ?? v1;
    const currentValue = v1 + (v2 - v1) * localT;
    return { ...s, currentValue };
  });

  const sorted = [...withCurrentValues].sort((a, b) => b.currentValue - a.currentValue);
  const maxValue = Math.max(...series.flatMap((s) => s.values));
  const barHeight = 70;
  const gap = 20;
  const colors = ["#2E86FF", "#FF6B6B", "#FFD400", "#2ECC71", "#A66BFF", "#FF9F1C", "#00C2CB", "#EF476F"];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F1115", padding: 80 }}>
      {title ? (
        <div style={{ fontSize: 44, fontWeight: 800, color: "white", fontFamily: resolveFont(font), marginBottom: 20 }}>
          {title}
        </div>
      ) : null}

      <div style={{ position: "relative", flex: 1 }}>
        {sorted.map((s, rank) => {
          const widthPct = (s.currentValue / maxValue) * 92;
          const originalIndex = series.findIndex((orig) => orig.label === s.label);
          const color = colors[originalIndex % colors.length];

          return (
            <div
              key={s.label}
              style={{
                position: "absolute",
                top: rank * (barHeight + gap),
                left: 0,
                width: "100%",
                height: barHeight,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{
                width: 160, color: "white", fontSize: 26, fontWeight: 700,
                fontFamily: resolveFont(font), textAlign: "right", paddingRight: 16, flexShrink: 0,
              }}>
                {s.label}
              </div>
              <div style={{ flex: 1, height: "100%", position: "relative" }}>
                <div style={{
                  width: `${widthPct}%`, height: "100%", background: color,
                  borderRadius: 8, display: "flex", alignItems: "center",
                  justifyContent: "flex-end", paddingRight: 16,
                }}>
                  <span style={{ color: "white", fontSize: 24, fontWeight: 700, fontFamily: resolveFont(font) }}>
                    {s.currentValue.toFixed(1)}{unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        position: "absolute", bottom: 60, right: 80, fontSize: 90, fontWeight: 800,
        color: "rgba(255,255,255,0.15)", fontFamily: resolveFont(font),
      }}>
        {currentYearLabel}
      </div>
    </AbsoluteFill>
  );
};
