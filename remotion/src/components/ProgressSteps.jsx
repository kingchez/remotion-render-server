import { interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

function Check() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// steps: ["Connect Drive", "Build workflow", "Add ElevenLabs", "Deploy"]
// Auto-advances through the steps across the scene's duration - each step
// becomes active in turn, then marked done, rather than a static snapshot.
export const ProgressSteps = ({ steps, durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const perStep = durationInFrames / steps.length;
  const rawIndex = frame / perStep;
  const activeIndex = Math.min(steps.length - 1, Math.floor(rawIndex));
  const withinStepProgress = rawIndex - activeIndex; // 0-1 pop-in progress for the active step
  const pop = interpolate(withinStepProgress, [0, 0.3], [0.7, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#0F1115", fontFamily: resolveFont(font),
    }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {steps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const color = isActive ? "#2E86FF" : isDone ? "#2ECC71" : "#2a2a30";
          const scale = isActive ? pop : 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 150 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", background: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 28, fontWeight: 700,
                  transform: `scale(${scale})`,
                  boxShadow: isActive ? "0 0 0 8px rgba(46,134,255,0.25)" : "none",
                }}>
                  {isDone ? <Check /> : i + 1}
                </div>
                <div style={{ marginTop: 12, fontSize: 20, color: isActive || isDone ? "white" : "#666", textAlign: "center" }}>
                  {step}
                </div>
              </div>
              {i < steps.length - 1 ? (
                <div style={{ width: 60, height: 4, background: i < activeIndex ? "#2ECC71" : "#2a2a30", marginTop: 33 }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
