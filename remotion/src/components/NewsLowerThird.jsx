import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { normalizeAssetUrl } from "../assetUrl";

export const NewsLowerThird = ({ backgroundImageUrl, headline, subtext, durationInFrames }) => {
  const frame = useCurrentFrame();
  const slideIn = interpolate(frame, [0, 15], [100, 0], { extrapolateRight: "clamp" });
  const slideOut = interpolate(
    frame, [durationInFrames - 15, durationInFrames], [0, 100], { extrapolateLeft: "clamp" }
  );
  const offset = frame < durationInFrames - 15 ? slideIn : slideOut;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {backgroundImageUrl ? (
        <Img src={normalizeAssetUrl(backgroundImageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ transform: `translateY(${offset}px)` }}>
          <div style={{
            background: "#C8102E", color: "white", fontSize: 30, fontWeight: 800,
            padding: "10px 28px", fontFamily: "Arial, sans-serif", display: "inline-block",
          }}>
            BREAKING
          </div>
          <div style={{
            background: "rgba(0,0,0,0.85)", color: "white", fontSize: 46, fontWeight: 700,
            padding: "20px 28px", fontFamily: "Arial, sans-serif",
          }}>
            {headline}
          </div>
          {subtext ? (
            <div style={{
              background: "rgba(0,0,0,0.6)", color: "#ddd", fontSize: 26,
              padding: "10px 28px", fontFamily: "Arial, sans-serif",
            }}>
              {subtext}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
