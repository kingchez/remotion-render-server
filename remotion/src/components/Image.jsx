import { computeMotion } from "../motion";
import { useChromaKeyedImage } from "../chromaKey";
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
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Local static assets (e.g. "illustrations/doodles/coffee-doodle.svg")
  // need a "/public/" prefix at render time - NOT because that's the
  // documented convention (staticFile() and Remotion Studio's preview both
  // serve public/ contents at the site root, no prefix needed), but
  // because @remotion/renderer's actual renderMedia() static server
  // (serve-handler, serving the bundle dir literally) does not replicate
  // that remapping, while bundle()'s publicDir copy physically nests
  // everything one level deeper at <bundleDir>/public/. Confirmed by
  // directly testing serveStatic(): a bare "/illustrations/..." request
  // 404s, "/public/illustrations/..." returns 200, against the same real
  // bundle output. Scene JSON / the illustration manifest intentionally
  // stay written as "illustrations/..." (no prefix) - this is the one
  // place that gap gets closed, so scene authors never need to know
  // about this bundler/render-server quirk. Anything already a full URL
  // (http(s), file:, data:) or already "/public/..." passes through as-is.
  const normalizedUrl =
    imageUrl && !/^(https?:|file:|data:)/i.test(imageUrl) && !imageUrl.startsWith("/public/")
      ? `/public/${imageUrl.replace(/^\/?/, "")}`
      : imageUrl;

  const resolvedSrc = useChromaKeyedImage(normalizedUrl, chromaKey);

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
      <Img src={resolvedSrc} style={{ width: "100%", height: "100%", objectFit }} />
    </div>
  );
};
