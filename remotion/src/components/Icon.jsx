import { computeMotion } from "../motion";
import { useCurrentFrame, useVideoConfig } from "remotion";

// The first primitive - built to be composed, not a fixed application-level
// scene like our other 25 components. Any scene can place an Icon anywhere,
// any size, any color, with any combination of shared motion animations.
export const Icon = ({
  iconSvg,
  size = 160,
  color = "#FFFFFF",
  x = 50, // percent, center-anchored (overridden by a "moveTo" animation if present)
  y = 50,
  animations = [{ type: "pop", start: 0, duration: 12 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  if (!iconSvg) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        width: size,
        height: size,
        color,
        transform: `translate(-50%, -50%) ${style.transform}`,
        opacity: style.opacity,
        boxShadow: highlightActive ? `0 0 0 6px ${highlightColor}, 0 0 30px 10px ${highlightColor}80` : "none",
        borderRadius: highlightActive ? "50%" : 0,
      }}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  );
};
