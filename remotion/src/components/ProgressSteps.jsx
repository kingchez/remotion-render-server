import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

function Check() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Upgraded from a flat interpolate-only pop (no spring, hardcoded blue/green)
// to real spring pop-ins and a settle-breathe on the active step, with
// accent color now prop-driven instead of hardcoded. Existing props
// (steps, durationInFrames, font) unchanged.
export const ProgressSteps = ({ steps, durationInFrames, accentColor = "#4ADE80", doneColor = "#2ECC71", font = "ui" }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const perStep = durationInFrames / steps.length;
  const rawIndex = frame / perStep;
  const activeIndex = Math.min(steps.length - 1, Math.floor(rawIndex));
  const stepStartFrame = activeIndex * perStep;

  const s = spring({ frame: frame - stepStartFrame, fps, durationInFrames: Math.round(fps * 0.4), config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const pop = interpolate(s, [0, 1], [0.7, 1]);
  const breathe = 1 + 0.02 * Math.sin((frame / fps) * Math.PI * 1.4);

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#0F1115", fontFamily: resolveFont(font),
    }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {steps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const color = isActive ? accentColor : isDone ? doneColor : "#2a2a30";
          const scale = isActive ? pop * breathe : 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 150 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", background: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 28, fontWeight: 700,
                  transform: `scale(${scale})`,
                  boxShadow: isActive ? `0 0 0 8px ${accentColor}40` : "none",
                }}>
                  {isDone ? <Check /> : i + 1}
                </div>
                <div style={{ marginTop: 12, fontSize: 20, color: isActive || isDone ? "white" : "#666", textAlign: "center" }}>
                  {step}
                </div>
              </div>
              {i < steps.length - 1 ? (
                <div style={{ width: 60, height: 4, background: i < activeIndex ? doneColor : "#2a2a30", marginTop: 33 }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
