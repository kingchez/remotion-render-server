import { Easing, interpolate } from "remotion";

// Generic animation engine shared by every primitive. Instead of each
// component inventing its own entrance logic, primitives pass their
// `animations` array through this and get back a single combined style.
//
// animations: [
//   { type: "slideInLeft" | "slideInRight" | "slideInUp" | "slideInDown",
//     start, duration, easing },
//   { type: "pop" | "fadeIn" | "fadeOut", start, duration, easing },
//   { type: "pulse", start, end, intensity },
//   { type: "shake", start, end, intensity },
//   { type: "highlight", start, end, color },
//   { type: "moveTo", from: {x,y}, to: {x,y}, start, duration, easing },
// ]
//
// `easing` (optional on any animation that has a duration) picks the curve
// used for its interpolate() calls. Every one of the CapCut/Premiere/AE
// tutorials researched treats "ease in/ease out, smooth the graph" as the
// single biggest lever for a professional feel - previously every
// animation here used plain linear interpolation regardless of what was
// requested, which reads as noticeably more robotic than the styles this
// engine is trying to reproduce. Defaults to "linear" so any existing
// scene-JSON that doesn't set `easing` renders pixel-identically to before.
const EASINGS = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  bounceOut: Easing.out(Easing.bounce),
  elasticOut: Easing.out(Easing.elastic(1.2)),
};

function resolveEasing(name) {
  return EASINGS[name] ?? Easing.linear;
}

export function computeMotion(animations = [], frame, fps = 30) {
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let opacity = 1;
  let positionOverride = null;
  let highlightActive = false;
  let highlightColor = "#FFD400";

  for (const anim of animations) {
    const start = anim.start ?? 0;
    const duration = anim.duration ?? 15;
    const localFrame = frame - start;
    const easing = resolveEasing(anim.easing);

    switch (anim.type) {
      case "slideInLeft":
      case "slideInRight":
      case "slideInUp":
      case "slideInDown": {
        const dir = anim.type.replace("slideIn", "").toLowerCase();
        const distance = anim.distance ?? 300;
        const progress = interpolate(localFrame, [0, duration], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        const offset = (1 - progress) * distance;
        if (dir === "left") translateX -= offset;
        if (dir === "right") translateX += offset;
        if (dir === "up") translateY -= offset;
        if (dir === "down") translateY += offset;
        opacity *= interpolate(localFrame, [0, duration * 0.6], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        break;
      }

      case "pop": {
        const progress = interpolate(localFrame, [0, duration], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        scale *= 0.6 + progress * 0.4;
        opacity *= progress;
        break;
      }

      case "fadeIn":
        opacity *= interpolate(localFrame, [0, duration], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        break;

      case "fadeOut":
        opacity *= interpolate(localFrame, [0, duration], [1, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        break;

      case "pulse": {
        const end = anim.end ?? start + 60;
        if (frame >= start && frame <= end) {
          const intensity = anim.intensity ?? 0.08;
          const cyclesPerSecond = 1.5;
          const t = (frame - start) / fps;
          scale *= 1 + Math.sin(t * cyclesPerSecond * Math.PI * 2) * intensity;
        }
        break;
      }

      case "shake": {
        const end = anim.end ?? start + 30;
        if (frame >= start && frame <= end) {
          const intensity = anim.intensity ?? 6;
          // Deterministic pseudo-random jitter (seeded by frame) - not
          // Math.random(), which would differ between render passes
          const seed = Math.sin(frame * 12.9898) * 43758.5453;
          const jitterX = ((seed - Math.floor(seed)) - 0.5) * 2 * intensity;
          const seed2 = Math.sin(frame * 78.233) * 12345.678;
          const jitterY = ((seed2 - Math.floor(seed2)) - 0.5) * 2 * intensity;
          translateX += jitterX;
          translateY += jitterY;
        }
        break;
      }

      case "highlight": {
        const end = anim.end ?? start + 60;
        if (frame >= start && frame <= end) {
          highlightActive = true;
          highlightColor = anim.color ?? highlightColor;
        }
        break;
      }

      case "moveTo": {
        const progress = interpolate(frame, [start, start + duration], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        positionOverride = {
          x: anim.from.x + (anim.to.x - anim.from.x) * progress,
          y: anim.from.y + (anim.to.y - anim.from.y) * progress,
        };
        break;
      }

      default:
        break;
    }
  }

  return {
    style: {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      opacity,
    },
    positionOverride,
    highlightActive,
    highlightColor,
  };
}
