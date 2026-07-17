import { interpolate } from "remotion";

// Only implements movements marked feasible (✅) or reasonably approximable
// (⚠️) in the Camera Movements research in style-library.md. Movements
// requiring true 3D (orbit, arc, true dolly parallax) are deliberately not
// here - they can't be faked convincingly with 2D compositing.
export function getCameraStyle(movement = "static", frame, durationInFrames, fps = 30) {
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Movements that pan/tilt/truck/pedestal need the content oversized so
  // moving it never reveals empty space at the frame edges.
  const OVERSCAN = 1.18;

  switch (movement) {
    case "static":
      return { wrapperStyle: {}, overlay: null };

    case "pan-left":
    case "truck-left": {
      const tx = interpolate(progress, [0, 1], [0, -8]); // percent of wrapper width
      return { wrapperStyle: { transform: `scale(${OVERSCAN}) translateX(${tx}%)` }, overlay: null };
    }
    case "pan-right":
    case "truck-right": {
      const tx = interpolate(progress, [0, 1], [0, 8]);
      return { wrapperStyle: { transform: `scale(${OVERSCAN}) translateX(${tx}%)` }, overlay: null };
    }

    case "tilt-up":
    case "pedestal-up": {
      const ty = interpolate(progress, [0, 1], [0, -8]);
      return { wrapperStyle: { transform: `scale(${OVERSCAN}) translateY(${ty}%)` }, overlay: null };
    }
    case "tilt-down":
    case "pedestal-down": {
      const ty = interpolate(progress, [0, 1], [0, 8]);
      return { wrapperStyle: { transform: `scale(${OVERSCAN}) translateY(${ty}%)` }, overlay: null };
    }

    case "zoom-in":
    case "dolly-in": {
      const scale = interpolate(progress, [0, 1], [1, 1.15]);
      return { wrapperStyle: { transform: `scale(${scale})` }, overlay: null };
    }
    case "zoom-out":
    case "dolly-out": {
      const scale = interpolate(progress, [0, 1], [1.15, 1]);
      return { wrapperStyle: { transform: `scale(${scale})` }, overlay: null };
    }

    case "crash-zoom-in": {
      // Fast, punchy - most of the scale change happens in the first 20%
      const scale = interpolate(progress, [0, 0.2, 1], [1, 1.25, 1.28]);
      return { wrapperStyle: { transform: `scale(${scale})` }, overlay: null };
    }
    case "crash-zoom-out": {
      const scale = interpolate(progress, [0, 0.2, 1], [1.28, 1.05, 1]);
      return { wrapperStyle: { transform: `scale(${scale})` }, overlay: null };
    }

    case "infinite-zoom": {
      // Continuous accelerating zoom, loops the scale via modulo so it
      // can run for any duration without hitting a hard ceiling.
      const cycleLength = fps * 3; // 3 seconds per cycle
      const cycleFrame = frame % cycleLength;
      const scale = interpolate(cycleFrame, [0, cycleLength], [1, 2.2]);
      return { wrapperStyle: { transform: `scale(${scale})` }, overlay: null };
    }

    case "handheld-shake": {
      // Deterministic jitter (not Math.random) so renders are reproducible
      const seedX = Math.sin(frame * 12.9898) * 43758.5453;
      const jitterX = ((seedX - Math.floor(seedX)) - 0.5) * 6;
      const seedY = Math.sin(frame * 78.233) * 12345.678;
      const jitterY = ((seedY - Math.floor(seedY)) - 0.5) * 6;
      const seedR = Math.sin(frame * 39.346) * 6789.01;
      const jitterRotate = ((seedR - Math.floor(seedR)) - 0.5) * 0.6;
      return {
        wrapperStyle: {
          transform: `scale(${OVERSCAN}) translate(${jitterX}px, ${jitterY}px) rotate(${jitterRotate}deg)`,
        },
        overlay: null,
      };
    }

    case "tilt-shift":
      // No transform on content - the blur-band overlay does the work.
      return { wrapperStyle: {}, overlay: "tilt-shift" };

    default:
      return { wrapperStyle: {}, overlay: null };
  }
}
