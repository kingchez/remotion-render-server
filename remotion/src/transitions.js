// Transition effects applied between consecutive scenes. `progress` is
// 0-1: 0 = fully the "from" state (invisible/start), 1 = fully "to" state
// (visible/settled). Used identically for fade-in (0->1 over the first N
// frames) and fade-out (1->0 over the last N frames, just invert progress).
export function getTransitionStyle(type, progress) {
  switch (type) {
    case "crossfade":
      return { opacity: progress };

    case "wipe-left":
      return { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` };

    case "wipe-right":
      return { clipPath: `inset(0 0 0 ${(1 - progress) * 100}%)` };

    case "zoom":
      return {
        opacity: progress,
        transform: `scale(${0.85 + progress * 0.15})`,
      };

    case "none":
    default:
      return {};
  }
}
