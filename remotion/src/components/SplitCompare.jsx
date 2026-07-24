import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { normalizeAssetUrl } from "../assetUrl";
import { resolveFont } from "../fonts";

export const SplitCompare = ({ leftImageUrl, rightImageUrl, leftLabel, rightLabel, font = "ui"}) => {
  const frame = useCurrentFrame();
  const dividerX = 50; // static center divider, could animate later
  const fade = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "black", opacity: fade }}>
      <AbsoluteFill style={{ width: "50%" }}>
        <Img src={normalizeAssetUrl(leftImageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {leftLabel ? (
          <div style={{
            position: "absolute", top: 40, left: 40, background: "rgba(0,0,0,0.7)", color: "white",
            padding: "10px 20px", borderRadius: 8, fontSize: 30, fontFamily: resolveFont(font),
          }}>
            {leftLabel}
          </div>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill style={{ width: "50%", left: "50%" }}>
        <Img src={normalizeAssetUrl(rightImageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {rightLabel ? (
          <div style={{
            position: "absolute", top: 40, right: 40, background: "rgba(0,0,0,0.7)", color: "white",
            padding: "10px 20px", borderRadius: 8, fontSize: 30, fontFamily: resolveFont(font),
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
