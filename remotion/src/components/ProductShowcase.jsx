import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { normalizeAssetUrl } from "../assetUrl";
import { resolveFont } from "../fonts";

export const ProductShowcase = ({ imageUrl, title, price, calloutText, durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.06], { extrapolateRight: "clamp" });
  const labelIn = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={normalizeAssetUrl(imageUrl)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 60 }}>
        <div style={{ opacity: labelIn }}>
          {title ? (
            <div style={{ fontSize: 42, fontWeight: 800, color: "#111", fontFamily: resolveFont(font) }}>
              {title}
            </div>
          ) : null}
          {price ? (
            <div style={{ fontSize: 36, fontWeight: 700, color: "#2E7D32", fontFamily: resolveFont(font) }}>
              {price}
            </div>
          ) : null}
          {calloutText ? (
            <div style={{
              marginTop: 10, background: "#FFD400", color: "#111", display: "inline-block",
              padding: "8px 18px", borderRadius: 8, fontSize: 26, fontWeight: 700, fontFamily: resolveFont(font),
            }}>
              {calloutText}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
