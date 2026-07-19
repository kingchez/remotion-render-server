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
  // New: gradient-fill text - { from, to, direction } - overrides `color`
  // when present, via background-clip:text (the "premium trending" fill
  // look several tutorials used on hook/headline text).
  colorGradient,
  // New: text outline/stroke - { color, width } - CSS -webkit-text-stroke.
  stroke,
  // New: CSS mix-blend-mode, e.g. "difference" | "multiply" | "lighter".
  blendMode,
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  const gradientStyles = colorGradient
    ? {
        backgroundImage: `linear-gradient(${colorGradient.direction ?? "90deg"}, ${colorGradient.from}, ${colorGradient.to})`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      }
    : { color };

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
        ...gradientStyles,
        textAlign: align,
        maxWidth: `${maxWidth}%`,
        WebkitTextStroke: stroke ? `${stroke.width ?? 1}px ${stroke.color ?? "#000000"}` : undefined,
        mixBlendMode: blendMode || "normal",
        textShadow: highlightActive ? `0 0 20px ${highlightColor}` : "0 2px 8px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
};
