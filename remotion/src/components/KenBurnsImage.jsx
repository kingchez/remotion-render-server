import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { normalizeAssetUrl } from "../assetUrl";

// Slow zoom on a static image + fade-in/out caption text
export const KenBurnsImage = ({ imageUrl, text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.12], {
    extrapolateRight: "clamp",
  });
  const textOpacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={normalizeAssetUrl(imageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {text ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 160 }}>
          <div style={{
            opacity: textOpacity, fontSize: 54, fontWeight: 700, color: "white",
            textAlign: "center", maxWidth: "85%", fontFamily: "Arial, sans-serif",
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}>
            {text}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
