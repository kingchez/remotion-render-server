import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export const SplitCompare = ({ leftImageUrl, rightImageUrl, leftLabel, rightLabel }) => {
  const frame = useCurrentFrame();
  const dividerX = 50; // static center divider, could animate later
  const fade = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "black", opacity: fade }}>
      <AbsoluteFill style={{ width: "50%" }}>
        <Img src={leftImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {leftLabel ? (
          <div style={{
            position: "absolute", top: 40, left: 40, background: "rgba(0,0,0,0.7)", color: "white",
            padding: "10px 20px", borderRadius: 8, fontSize: 30, fontFamily: "Arial, sans-serif",
          }}>
            {leftLabel}
          </div>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill style={{ width: "50%", left: "50%" }}>
        <Img src={rightImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {rightLabel ? (
          <div style={{
            position: "absolute", top: 40, right: 40, background: "rgba(0,0,0,0.7)", color: "white",
            padding: "10px 20px", borderRadius: 8, fontSize: 30, fontFamily: "Arial, sans-serif",
          }}>
            {rightLabel}
          </div>
        ) : null}
      </AbsoluteFill>
      <div style={{
        position: "absolute", left: `${dividerX}%`, top: 0, bottom: 0, width: 4, background: "white",
      }} />
    </AbsoluteFill>
  );
};
