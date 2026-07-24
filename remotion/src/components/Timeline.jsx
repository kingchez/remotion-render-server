import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

export const Timeline = ({ events, durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const lineProgress = interpolate(frame, [0, durationInFrames * 0.6], [0, 100], {
    extrapolateRight: "clamp",
  });
  const perEvent = durationInFrames / events.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F1115", justifyContent: "center", padding: "0 100px" }}>
      <div style={{ position: "relative", height: 6, background: "#333", borderRadius: 3 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${lineProgress}%`, background: "#2E86FF", borderRadius: 3,
        }} />
        {events.map((ev, i) => {
          const start = i * perEvent;
          const pop = interpolate(frame, [start, start + 10], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const leftPct = (i / Math.max(events.length - 1, 1)) * 100;
          return (
            <div key={i} style={{
              position: "absolute", left: `${leftPct}%`, top: -70,
              transform: `translateX(-50%) scale(${pop})`, opacity: pop, textAlign: "center",
            }}>
              <div style={{ color: "#2E86FF", fontWeight: 800, fontSize: 24, fontFamily: resolveFont(font) }}>
                {ev.date}
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#2E86FF", margin: "8px auto",
              }} />
              <div style={{
                color: "white", fontSize: 22, fontFamily: resolveFont(font), maxWidth: 220,
              }}>
                {ev.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
