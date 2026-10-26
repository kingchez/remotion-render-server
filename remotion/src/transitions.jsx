// Transition effects applied between consecutive scenes. `progress` is
// 0-1: 0 = fully the "from" state (invisible/start), 1 = fully "to" state
// (visible/settled). Used identically for fade-in (0->1 over the first N
// frames) and fade-out (1->0 over the last N frames, just invert progress).
// `phase` is "in" for the incoming scene and "out" for the outgoing one. Most
// transitions treat both the same; "band-wipe" only clips the incoming scene
// (the outgoing one stays whole underneath and is covered by it).
export function getTransitionStyle(type, progress, phase = "in") {
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

    // Slides: the incoming scene travels over the outgoing one, which stays put.
    case "slide-left":
      return phase === "in" ? { transform: `translateX(${(1 - progress) * 100}%)` } : {};
    case "slide-right":
      return phase === "in" ? { transform: `translateX(${-(1 - progress) * 100}%)` } : {};
    case "slide-up":
      return phase === "in" ? { transform: `translateY(${(1 - progress) * 100}%)` } : {};
    case "slide-down":
      return phase === "in" ? { transform: `translateY(${-(1 - progress) * 100}%)` } : {};

    // Pushes: both scenes travel together, the old one shoved out by the new.
    case "push-left":
      return phase === "in"
        ? { transform: `translateX(${(1 - progress) * 100}%)` }
        : { transform: `translateX(${-(1 - progress) * 100}%)` };
    case "push-up":
      return phase === "in"
        ? { transform: `translateY(${(1 - progress) * 100}%)` }
        : { transform: `translateY(${-(1 - progress) * 100}%)` };

    // Iris: a circle opens on the incoming scene (covers a 16:9 corner at ~72%).
    case "iris":
      return phase === "in" ? { clipPath: `circle(${progress * 72}% at 50% 50%)` } : {};

    // Flash: the incoming scene switches on at the midpoint, hidden under a white
    // flash that TransitionWrapper draws.
    case "flash":
      return phase === "in" ? { opacity: progress < 0.5 ? 0 : 1 } : {};

    // Blur dissolve: both scenes defocus while they cross-fade.
    case "blur":
      return { opacity: progress, filter: `blur(${(1 - progress) * 28}px)` };

    case "band-wipe":
      // Vertical band sweeping left to right; the band itself is drawn by
      // TransitionWrapper (see BandWipe in SceneVideo.jsx).
      return phase === "in" ? { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` } : {};

    case "none":
    default:
      return {};
  }
}
