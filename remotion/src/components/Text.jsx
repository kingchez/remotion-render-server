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
  rotate = 0,
  scaleX = 1,
  letterSpacing,
  lineHeight,
  textShadow,
  colorGradient,
  stroke,
  blendMode,
  typewriter,
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  const displayedText = typewriter
    ? (() => {
        const start = typewriter.start ?? 0;
        const duration = Math.max(1, typewriter.duration ?? 24);
        if (frame < start) return "";
        const progress = Math.min(1, Math.max(0, (frame - start) / duration));
        const minChars = typewriter.minChars ?? 1;
        const count = Math.min(text.length, Math.max(minChars, Math.round(progress * text.length)));
        return text.slice(0, count);
      })()
    : text;

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
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scaleX(${scaleX}) ${style.transform}`,
        opacity: style.opacity,
        fontSize: size,
        fontWeight: weight,
        fontFamily: resolveFont(font),
        letterSpacing: letterSpacing ?? undefined,
        lineHeight: lineHeight ?? undefined,
        ...gradientStyles,
        textAlign: align,
        maxWidth: `${maxWidth}%`,
        WebkitTextStroke: stroke ? `${stroke.width ?? 1}px ${stroke.color ?? "#000000"}` : undefined,
        mixBlendMode: blendMode || "normal",
        textShadow: highlightActive
          ? `0 0 20px ${highlightColor}`
          : textShadow !== undefined
            ? textShadow
            : "0 2px 8px rgba(0,0,0,0.6)",
      }}
    >
      {displayedText}
    </div>
  );
};
