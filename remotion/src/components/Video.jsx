import { computeMotion } from "../motion";
import { normalizeAssetUrl } from "../assetUrl";
import { OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";

// Video primitive - the scene-graph's counterpart to Image, for stock
// b-roll (Pexels/Pixabay), AI-generated clips, or any other source-clip
// media. Resolved the same generic way as every other asset: n8n uploads
// the final file to Drive, the scene JSON carries a `videoDriveFileId`
// prop on this object, and the server's existing resolveAssets() (see
// src/index.js) turns that into `videoUrl` before this component ever
// runs - no new resolution mechanism needed.
//
// `startFrom` lets a source clip longer than the scene's duration_needed
// be trimmed down at render time (e.g. use seconds 3-7 of a 20s stock
// clip) instead of needing that trim done upstream in n8n - one less
// step in the resolver, and OffthreadVideo already supports it natively.
export const Video = ({
  videoUrl,
  width = 400,
  height = 400,
  x = 50,
  y = 50,
  objectFit = "cover",
  borderRadius = 0,
  // Trim window into the SOURCE clip, in seconds - not scene-relative
  // frames. E.g. startFrom={3} skips the clip's first 3 seconds.
  startFrom = 0,
  endAt,
  // Playback speed - occasionally useful for stock clips that run too
  // fast/slow relative to the scene's pacing (e.g. slow-mo b-roll).
  playbackRate = 1,
  // Stock/AI b-roll is silent 95% of the time (voiceover/music carry the
  // audio); default muted so a clip's own baked-in sound doesn't collide
  // with those tracks. Set volume explicitly when a clip's own audio is
  // actually wanted (rare - e.g. a specific ambient-sound b-roll choice).
  volume = 0,
  blendMode,
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolvedSrc = normalizeAssetUrl(videoUrl);

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  if (!resolvedSrc) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) ${style.transform}`,
        opacity: style.opacity,
        width,
        height,
        borderRadius,
        overflow: "hidden",
        mixBlendMode: blendMode || "normal",
        boxShadow: highlightActive ? `0 0 0 6px ${highlightColor}` : "none",
      }}
    >
      <OffthreadVideo
        src={resolvedSrc}
        startFrom={Math.round(startFrom * fps)}
        endAt={endAt != null ? Math.round(endAt * fps) : undefined}
        playbackRate={playbackRate}
        volume={volume}
        style={{ width: "100%", height: "100%", objectFit }}
      />
    </div>
  );
};
