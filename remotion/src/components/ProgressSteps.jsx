import { interpolate, useCurrentFrame } from "remotion";

// steps: ["Connect Drive", "Build workflow", "Add ElevenLabs", "Deploy"]
export const ProgressSteps = ({ steps, activeIndex = 0, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#0F1115", fontFamily: "Arial, sans-serif", opacity,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {steps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const color = isActive ? "#2E86FF" : isDone ? "#2ECC71" : "#333";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", background: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 28, fontWeight: 700,
                  boxShadow: isActive ? `0 0 0 8px rgba(46,134,255,0.25)` : "none",
                }}>
                  {isDone ? "✓" : i + 1}
                </div>
                <div style={{ marginTop: 12, fontSize: 20, color: isActive ? "white" : "#888", maxWidth: 140, textAlign: "center" }}>
                  {step}
                </div>
              </div>
              {i < steps.length - 1 ? (
                <div style={{ width: 80, height: 4, background: isDone ? "#2ECC71" : "#333", margin: "0 8px", marginTop: -30 }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
