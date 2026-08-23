import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// Upgraded from a flat linear pop (no spring, hardcoded blue) to a real
// spring pop-in per event with prop-driven accent color. Existing props
// (events, durationInFrames, font) unchanged.
export const Timeline = ({ events, durationInFrames, accentColor = "#4ADE80", font = "ui" }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const lineProgress = interpolate(frame, [0, durationInFrames * 0.6], [0, 100], { extrapolateRight: "clamp" });
  const perEvent = durationInFrames / events.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F1115", justifyContent: "center", padding: "0 100px" }}>
      <div style={{ position: "relative", height: 6, background: "#333", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${lineProgress}%`, background: accentColor, borderRadius: 3 }} />
        {events.map((ev, i) => {
          const start = i * perEvent;
          const s = spring({ frame: frame - start, fps, durationInFrames: Math.round(fps * 0.35), config: { damping: 12, stiffness: 200, mass: 0.6 } });
          const leftPct = (i / Math.max(events.length - 1, 1)) * 100;
          return (
            <div key={i} style={{
              position: "absolute", left: `${leftPct}%`, top: -70,
              transform: `translateX(-50%) scale(${s})`, opacity: s, textAlign: "center",
            }}>
              <div style={{ color: accentColor, fontWeight: 800, fontSize: 24, fontFamily: resolveFont(font) }}>{ev.date}</div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: accentColor, margin: "8px auto" }} />
              <div style={{ color: "white", fontSize: 22, fontFamily: resolveFont(font), maxWidth: 220 }}>{ev.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
