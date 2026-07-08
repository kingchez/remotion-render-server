import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export const MapZoom = ({ imageUrl, label, fromScale = 1, toScale = 1.3, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [fromScale, toScale], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {label ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-start", padding: 60 }}>
          <div style={{
            background: "rgba(0,0,0,0.75)", color: "white", padding: "14px 26px",
            borderRadius: 12, fontSize: 36, fontWeight: 700, fontFamily: "Arial, sans-serif",
          }}>
            📍 {label}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
