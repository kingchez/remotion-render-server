import { computeMotion } from "../motion";
import { resolveFont } from "../fonts";
import { useCurrentFrame, useVideoConfig } from "remotion";

export const Text = ({
  text,
  size = 48,
  color = "#FFFFFF",
  weight = 700,
  font = "Arial, sans-serif",
  x = 50,
  y = 50,
  align = "center",
  maxWidth = 80, // percent
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) ${style.transform}`,
        opacity: style.opacity,
        fontSize: size,
        fontWeight: weight,
        fontFamily: resolveFont(font),
        color,
        textAlign: align,
        maxWidth: `${maxWidth}%`,
        textShadow: highlightActive ? `0 0 20px ${highlightColor}` : "0 2px 8px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
};
