import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";
import { normalizeAssetUrl } from "../assetUrl";

// ANNOTATED SCREENSHOT — a real screenshot with brackets that draw in
// around specific UI regions, plus optional callout labels and an optional
// zoom-into-highlights hold. Ported/adapted from a reference motion-
// graphics skill. Distinct from Screencast's highlightBox (a moving
// highlight on a VIDEO recording, per Screencast's own use case) - this is
// for a single static screenshot where you want to progressively draw
// attention to 1-4 specific regions, with real coordinates in image-
// fraction space so it's resolution-independent.
//
// highlights: [{ x, y, w, h, label?, labelAnchor?, appearAtSec? }]
// x/y/w/h are fractions (0..1) of the IMAGE, not the frame.
export const AnnotatedScreenshot = ({
  imageUrl,
  highlights = [],
  zoomToHighlights = false,
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const src = normalizeAssetUrl(imageUrl);
  const N = Math.min(4, highlights.length);

  const totalSec = (durationInFrames ?? 150) / fps;
  const span = totalSec * 0.5;
  const norm = highlights.slice(0, N).map((h, i) => ({ ...h, appearAtSec: typeof h.appearAtSec === "number" ? h.appearAtSec : (span / Math.max(1, N)) * i }));

  // zoom-to-highlights: after all highlights have drawn, smoothly zoom into
  // the union bounding box and hold there.
  let zoomScale = 1, zoomOriginX = 50, zoomOriginY = 50;
  if (zoomToHighlights && N > 0) {
    const lastAppearF = Math.round(Math.max(...norm.map((h) => h.appearAtSec)) * fps);
    const zoomStartF = lastAppearF + Math.round(fps * 0.4);
    const zoomK = interpolate(frame, [zoomStartF, zoomStartF + Math.round(fps * 0.9)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const minX = Math.min(...norm.map((h) => h.x));
    const minY = Math.min(...norm.map((h) => h.y));
    const maxX = Math.max(...norm.map((h) => h.x + h.w));
    const maxY = Math.max(...norm.map((h) => h.y + h.h));
    const boxW = Math.max(0.1, maxX - minX);
    const boxH = Math.max(0.1, maxY - minY);
    const targetScale = Math.min(2.4, 0.9 / Math.max(boxW, boxH));
    zoomScale = interpolate(zoomK, [0, 1], [1, targetScale]);
    zoomOriginX = interpolate(zoomK, [0, 1], [50, ((minX + maxX) / 2) * 100]);
    zoomOriginY = interpolate(zoomK, [0, 1], [50, ((minY + maxY) / 2) * 100]);
  }

  if (!src) return null;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F121A", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${zoomScale})`, transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
      }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {norm.map((h, i) => {
            const appearF = Math.round(h.appearAtSec * fps);
            const drawK = interpolate(frame, [appearF, appearF + Math.round(fps * 0.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            if (drawK <= 0) return null;
            const bx = h.x * 100, by = h.y * 100, bw = h.w * 100, bh = h.h * 100;
            const cornerLen = Math.min(bw, bh) * 0.28;
            return (
              <g key={i} opacity={drawK} strokeWidth={0.4} stroke={accentColor} fill="none">
                <path d={`M ${bx} ${by + cornerLen} L ${bx} ${by} L ${bx + cornerLen} ${by}`} />
                <path d={`M ${bx + bw - cornerLen} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + cornerLen}`} />
                <path d={`M ${bx + bw} ${by + bh - cornerLen} L ${bx + bw} ${by + bh} L ${bx + bw - cornerLen} ${by + bh}`} />
                <path d={`M ${bx + cornerLen} ${by + bh} L ${bx} ${by + bh} L ${bx} ${by + bh - cornerLen}`} />
              </g>
            );
          })}
        </svg>
      </div>
      {norm.map((h, i) => {
        if (!h.label) return null;
        const appearF = Math.round(h.appearAtSec * fps);
        const labelK = interpolate(frame, [appearF + Math.round(fps * 0.3), appearF + Math.round(fps * 0.55)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const anchor = h.labelAnchor ?? "right";
        const bx = h.x * width, by = h.y * height, bw = h.w * width, bh = h.h * height;
        let left = bx + bw + 16, top = by + bh / 2 - 16;
        if (anchor === "left") { left = bx - 200; }
        if (anchor === "top") { left = bx; top = by - 50; }
        if (anchor === "bottom") { left = bx; top = by + bh + 16; }
        return (
          <div key={`l${i}`} style={{
            position: "absolute", left, top, opacity: labelK, transform: `translateY(${(1 - labelK) * 8}px)`,
            background: accentColor, color: "#0F121A", fontFamily: resolveFont(font), fontWeight: 700,
            fontSize: Math.round(typeBase * 0.02), padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}>
            {h.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
