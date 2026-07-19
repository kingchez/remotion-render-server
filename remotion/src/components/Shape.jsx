import { computeMotion } from "../motion";
import { useCurrentFrame, useVideoConfig } from "remotion";

// Converts a hex color to "r, g, b" for building rgba() strings - longShadow
// needs to vary alpha per step, which requires an rgb triplet rather than
// a hex string.
function hexToRgbTriplet(hex) {
  const clean = (hex || "#000000").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

// The Film-Impact-plugin "long shadow" look - a trail of progressively
// offset, progressively-faded copies cast toward one direction. Built as a
// single stacked box-shadow (one shadow per 1px step) rather than actual
// duplicate DOM layers, so it stays cheap.
function buildLongShadow({ color = "#000000", length = 40, angle = 45, opacity = 0.5 }) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const rgb = hexToRgbTriplet(color);
  const steps = Math.max(Math.round(length), 10);
  const shadows = [];
  for (let i = 1; i <= steps; i++) {
    const alpha = opacity * (1 - i / steps);
    shadows.push(`${(dx * i).toFixed(1)}px ${(dy * i).toFixed(1)}px 0 rgba(${rgb}, ${alpha.toFixed(3)})`);
  }
  return shadows;
}

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
  // New: AE-layer-style inner shadow - { color, blur, offsetX, offsetY } - CSS box-shadow inset.
  innerShadow,
  // New: Film-Impact-style long shadow - { color, length, angle, opacity }.
  // `angle` is degrees (0 = right, 90 = down). `length` is roughly the
  // shadow's pixel reach.
  longShadow,
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

  // box-shadow is a shared CSS bucket for three independent things - the
  // highlight ring, the inner shadow, and the long-shadow trail - so they
  // all get collected into one array and joined, rather than one
  // overwriting another.
  const boxShadows = [];
  if (longShadow) boxShadows.push(...buildLongShadow(longShadow));
  if (innerShadow) {
    boxShadows.push(
      `inset ${innerShadow.offsetX ?? 0}px ${innerShadow.offsetY ?? 0}px ${innerShadow.blur ?? 10}px ${innerShadow.color ?? "rgba(0,0,0,0.5)"}`
    );
  }
  if (highlightActive) boxShadows.push(`0 0 0 6px ${highlightColor}`);

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
        boxShadow: boxShadows.length ? boxShadows.join(", ") : "none",
      }}
    />
  );
};
