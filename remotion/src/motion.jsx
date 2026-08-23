import { Easing, interpolate, spring } from "remotion";

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
//   { type: "springIn", start, duration, damping?, stiffness?, mass?, fromScale? },
//   { type: "livingHold", start, rampDuration?, maxScale?, driftY? },
//   { type: "dissolveOut", start, duration, easing, scaleAmount?, riseAmount?, blurAmount? },
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
  let blurPx = 0;
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

      // New: real spring-physics entrance (scale+opacity), instead of a
      // linear/eased tween. Confirmed spring() ships inside the core
      // `remotion` package already in this repo's dependencies - it was
      // simply never used here before. Config knobs match the "cinematic,
      // slightly overshooting" feel used across a well-regarded reference
      // motion-graphics set: lower damping = more bounce.
      case "springIn": {
        const s = spring({
          frame: localFrame, fps,
          durationInFrames: duration,
          config: {
            damping: anim.damping ?? 14,
            stiffness: anim.stiffness ?? 200,
            mass: anim.mass ?? 0.6,
          },
        });
        const fromScale = anim.fromScale ?? 0.6;
        scale *= interpolate(s, [0, 1], [fromScale, 1]);
        opacity *= interpolate(s, [0, 0.7], [0, 1], { extrapolateRight: "clamp" });
        break;
      }

      // New: continuous idle drift+scale so a held object never sits as a
      // frozen frame - the "living hold" principle: apply for the rest of
      // the scene once `start` is reached, no `end` needed. Monotonic and
      // tiny (default `maxScale`/`driftY` are subtle) - meant to read as
      // "alive", not as visible motion.
      case "livingHold": {
        if (frame >= start) {
          const dur = anim.rampDuration ?? 120; // frames to ramp up to full drift
          const k = interpolate(frame - start, [0, dur], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease),
          });
          const maxScale = anim.maxScale ?? 1.02;
          const driftY = anim.driftY ?? -6;
          scale *= 1 + (maxScale - 1) * k;
          translateY += driftY * k;
        }
        break;
      }

      // New: choreographed exit - fade + slight scale-up + blur combined,
      // reads as "dissolving forward" rather than a flat cut/fade. `blur`
      // is returned separately since it's a filter, not a transform -
      // consuming components should apply `filter: blur(${blurPx}px)`
      // alongside the returned transform/opacity.
      case "dissolveOut": {
        const progress = interpolate(localFrame, [0, duration], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing,
        });
        opacity *= 1 - progress;
        scale *= 1 + progress * (anim.scaleAmount ?? 0.04);
        translateY -= progress * (anim.riseAmount ?? 14);
        blurPx += progress * (anim.blurAmount ?? 10);
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
      filter: blurPx > 0.05 ? `blur(${blurPx}px)` : undefined,
    },
    positionOverride,
    highlightActive,
    highlightColor,
  };
}
