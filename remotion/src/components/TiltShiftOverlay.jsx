import { AbsoluteFill } from "remotion";

export const TiltShiftOverlay = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "30%",
        backdropFilter: "blur(6px)",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0))",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
        backdropFilter: "blur(6px)",
        background: "linear-gradient(to top, rgba(0,0,0,0.15), rgba(0,0,0,0))",
      }} />
    </AbsoluteFill>
  );
};
