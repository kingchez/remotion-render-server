import { computeMotion } from "../motion";
import { useCurrentFrame, useVideoConfig } from "remotion";

// The second foundational primitive (after Icon). Only Icon/Text/Image
// existed before this - meaning anything built from a plain rectangle,
// circle, or rounded panel (background panels, toggle-switch pills,
// gradient circles, glass-morphism cards, dividing lines - a large share
// of the CapCut/Premiere/AE research) wasn't representable in scene-JSON
// at all. This fills that gap the same way Icon/Text/Image do: small,
// composable, driven by the shared motion engine.
export const Shape = ({
  kind = "rect", // "rect" | "circle"
  width = 200,
  height = 200,
  x = 50, // percent, center-anchored (overridden by a "moveTo" animation if present)
  y = 50,
  fill = "#FFFFFF", // solid color string, OR { from, to, direction } for a gradient
  stroke, // { color, width }
  borderRadius = 0, // ignored for kind="circle" (always fully round)
  blur = 0, // px - box-blur on the shape itself (useful for casted-shadow recipes)
  backdropBlur, // px - glass-morphism: blurs whatever is BEHIND the shape, not the shape itself
  shadow, // { color, blur, offsetX, offsetY } - CSS drop-shadow, the "duplicate + black fill + blur" trick from every tutorial, without the duplicate layer
  blendMode, // CSS mix-blend-mode, e.g. "multiply" | "difference" | "lighter"
  opacity: baseOpacity = 1,
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  const background =
    typeof fill === "object" && fill !== null
      ? `linear-gradient(${fill.direction ?? "180deg"}, ${fill.from}, ${fill.to})`
      : fill;

  const filters = [];
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (shadow) {
    filters.push(
      `drop-shadow(${shadow.offsetX ?? 0}px ${shadow.offsetY ?? 0}px ${shadow.blur ?? 10}px ${shadow.color ?? "rgba(0,0,0,0.5)"})`
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        width,
        height,
        background,
        borderRadius: kind === "circle" ? "50%" : borderRadius,
        border: stroke ? `${stroke.width ?? 2}px solid ${stroke.color ?? "#FFFFFF"}` : "none",
        backdropFilter: backdropBlur ? `blur(${backdropBlur}px)` : "none",
        mixBlendMode: blendMode || "normal",
        filter: filters.length ? filters.join(" ") : "none",
        transform: `translate(-50%, -50%) ${style.transform}`,
        opacity: baseOpacity * style.opacity,
        boxShadow: highlightActive ? `0 0 0 6px ${highlightColor}` : "none",
      }}
    />
  );
};
