import { interpolate, useCurrentFrame } from "remotion";

// This is the first "primitive" component - built to be composed, not a
// fixed application-level scene like our other 25 components. Any scene
// (or a future generic multi-object scene) can place an Icon anywhere,
// any size, any color, with a simple pop-in animation.
export const Icon = ({
  iconSvg,
  size = 160,
  color = "#FFFFFF",
  x = 50, // percent, center-anchored
  y = 50, // percent, center-anchored
  entrance = "pop", // "pop" | "fade" | "none"
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();

  let opacity = 1;
  let scale = 1;

  if (entrance === "pop") {
    opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    scale = interpolate(frame, [0, 12], [0.6, 1], { extrapolateRight: "clamp" });
  } else if (entrance === "fade") {
    opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  }

  if (!iconSvg) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        width: size,
        height: size,
        color,
      }}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  );
};
