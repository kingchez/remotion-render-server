import { computeMotion } from "../motion";
import { useChromaKeyedImage } from "../chromaKey";
import { normalizeAssetUrl } from "../assetUrl";
import { Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Image = ({
  imageUrl,
  width = 400,
  height = 400,
  x = 50,
  y = 50,
  objectFit = "cover",
  borderRadius = 0,
  // Optional true color-based chroma key, e.g. { color: "#00FF00",
  // similarity: 0.4, smoothness: 0.08 } - only removes a uniform key
  // color background (like a green screen), not arbitrary photo
  // backgrounds. See ../chromaKey.jsx for the tradeoffs.
  chromaKey,
  // New: CSS mix-blend-mode, e.g. "multiply" | "difference" | "lighter".
  blendMode,
  // New: px - box-blur on the image itself. Two shapes:
  // - a plain number (e.g. blur: 8) - static blur, unchanging for the
  //   whole scene. Common use: a defocused background photo behind sharp
  //   foreground text (the "focus-pull" look).
  // - { from, to, start, duration, easing? } - ANIMATED blur, interpolated
  //   over time same as any other keyframed value. Common use: the
  //   "diagrammatic sequence" look - a step/item sits blurred (e.g.
  //   from: 12) until the voiceover actually reaches it, then sharpens
  //   (to: 0) right on cue. Pair `start` with that item's real word-timing
  //   timestamp so the unblur lands exactly when it's mentioned.
  blur = 0,
  // New: degrees - static rotation of the whole image, e.g. for a
  // deliberately tilted screen-recording/photo-card look. Not animated
  // (no keyframing) - a fixed look, same as a physical print laid at an
  // angle. Combine with a slight zoom on the parent scene if rotation
  // reveals corners outside the frame.
  rotate = 0,
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolvedSrc = useChromaKeyedImage(normalizeAssetUrl(imageUrl), chromaKey);

  const { style, positionOverride, highlightActive, highlightColor } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  const resolvedBlur =
    blur && typeof blur === "object"
      ? interpolate(frame, [blur.start ?? 0, (blur.start ?? 0) + (blur.duration ?? 15)], [blur.from ?? 0, blur.to ?? 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : blur;

  if (!resolvedSrc) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) ${style.transform}`,
        opacity: style.opacity,
        width,
        height,
        borderRadius,
        overflow: "hidden",
        mixBlendMode: blendMode || "normal",
        filter: resolvedBlur > 0 ? `blur(${resolvedBlur}px)` : "none",
        boxShadow: highlightActive ? `0 0 0 6px ${highlightColor}` : "none",
      }}
    >
      <Img src={resolvedSrc} style={{ width: "100%", height: "100%", objectFit }} />
    </div>
  );
};
