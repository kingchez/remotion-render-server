import { interpolate } from "remotion";

// Builds the volume-envelope function passed to the background <Audio
// volume={...}> track. Remotion already supports volume-as-a-function-of-
// frame, so "ducking" doesn't need a new audio engine - just a function
// that reads full volume by default, and dips down (with a short fade so
// it's not an audible jump-cut) during any frame range where a per-scene
// voiceover is playing.
//
// voiceoverWindows: [{ start, end }] - frame ranges (absolute, video-wide)
// where a scene's own audioUrl (voiceover) is active.
export function createMusicVolumeFn(voiceoverWindows, {
  normalVolume = 1,
  duckedVolume = 0.25,
  fadeFrames = 15,
} = {}) {
  if (!voiceoverWindows || voiceoverWindows.length === 0) {
    return normalVolume;
  }

  return (frame) => {
    for (const w of voiceoverWindows) {
      const fadeInStart = w.start - fadeFrames;
      const fadeOutEnd = w.end + fadeFrames;
      if (frame < fadeInStart || frame > fadeOutEnd) continue;

      if (frame < w.start) {
        const progress = interpolate(frame, [fadeInStart, w.start], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return normalVolume + (duckedVolume - normalVolume) * progress;
      }
      if (frame > w.end) {
        const progress = interpolate(frame, [w.end, fadeOutEnd], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return duckedVolume + (normalVolume - duckedVolume) * progress;
      }
      return duckedVolume;
    }
    return normalVolume;
  };
}
