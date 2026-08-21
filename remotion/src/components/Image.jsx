import { computeMotion } from "../motion";
import { useChromaKeyedImage } from "../chromaKey";
import { normalizeAssetUrl } from "../assetUrl";
import { Img, useCurrentFrame, useVideoConfig } from "remotion";

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
  // New: px - box-blur on the image itself. Same pattern as Shape.blur.
  // Common use: a defocused background photo behind sharp foreground text
  // (the "focus-pull" look) - pre-blurring a duplicate asset isn't needed
  // anymore, just set blur on the same Image object holding the photo.
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
        filter: blur > 0 ? `blur(${blur}px)` : "none",
        boxShadow: highlightActive ? `0 0 0 6px ${highlightColor}` : "none",
      }}
    >
      <Img src={resolvedSrc} style={{ width: "100%", height: "100%", objectFit }} />
    </div>
  );
};
