import { computeMotion } from "../motion";
import { Img, useCurrentFrame, useVideoConfig } from "remotion";

export const Image = ({
  imageUrl,
  width = 400,
  height = 400,
  x = 50,
  y = 50,
  objectFit = "cover",
  borderRadius = 0,
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) ${style.transform}`,
        opacity: style.opacity,
        width,
        height,
        borderRadius,
        overflow: "hidden",
        boxShadow: highlightActive ? `0 0 0 6px ${highlightColor}` : "none",
      }}
    >
      <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit }} />
    </div>
  );
};
