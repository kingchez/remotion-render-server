import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";
import { normalizeAssetUrl } from "../assetUrl";

// NOTIFICATION TOAST — an iOS/macOS-style push-notification card that
// springs in, holds, and springs back out. A partial overlay (doesn't take
// over the frame) - built for "I got a Slack message saying X" / social-
// proof beats ("Shopify: new order for $780"). Replaces the hand-built
// Shape+Icon+Text recipe from earlier planning sessions with a real
// component: proper spring physics on the slide (not a linear tween),
// title/body/timestamp layout with line-clamping, and a resolved app icon
// via the normal *DriveFileId/imageUrl convention (or the Icon primitive's
// Simple Icons catalog for a well-known brand - resolve that at the scene-
// planning layer and pass the resulting iconUrl in).
export const NotificationToast = ({
  appName,
  appIconUrl, // resolved image URL - via imageUrl or *DriveFileId at the scene-planning layer
  title,
  body,
  time = "now",
  anchor = "top-right", // "top-right" | "top-center"
  durationInFrames,
}) => {
  const { fps, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const font = resolveFont("ui");

  const cardW = Math.round(width * 0.32);
  const margin = 40;
  const cardLeft = anchor === "top-center" ? Math.round((width - cardW) / 2) : width - cardW - margin;
  const cardTop = margin;

  const enterFrames = Math.round(fps * 0.55);
  const exitFrames = Math.round(fps * 0.45);
  const total = durationInFrames ?? 90;
  const exitStart = total - exitFrames;

  const inProg = spring({ frame, fps, durationInFrames: enterFrames, config: { damping: 16, stiffness: 130, mass: 0.7 } });
  const outProg = frame > exitStart
    ? spring({ frame: frame - exitStart, fps, durationInFrames: exitFrames, config: { damping: 18, stiffness: 110, mass: 0.7 } })
    : 0;

  const slideY = interpolate(inProg, [0, 1], [-cardW * 0.35, 0]) + interpolate(outProg, [0, 1], [0, -cardW * 0.35]);
  const opacity = Math.min(inProg, 1 - outProg);
  const resolvedIcon = appIconUrl ? normalizeAssetUrl(appIconUrl) : null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute", left: cardLeft, top: cardTop, width: cardW,
          backgroundColor: "rgba(245,247,248,0.92)", backdropFilter: "blur(14px)",
          borderRadius: 22, padding: "14px 16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.30), 0 5px 10px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.55)",
          opacity, transform: `translateY(${slideY}px)`,
          display: "flex", gap: 12, alignItems: "flex-start",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: resolvedIcon ? "transparent" : "#4ADE80", flexShrink: 0, overflow: "hidden", position: "relative" }}>
          {resolvedIcon ? (
            <Img src={resolvedIcon} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontWeight: 700, fontSize: 22, color: "#0F121A" }}>
              ✦
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 3 }}>
            <span style={{ fontFamily: font, fontWeight: 600, fontSize: 13, color: "#5A6275", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {appName}
            </span>
            <span style={{ fontFamily: font, fontWeight: 500, fontSize: 13, color: "#9AA3AB", flexShrink: 0 }}>{time}</span>
          </div>
          <div style={{ fontFamily: font, fontWeight: 700, fontSize: 17, color: "#0F121A", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>
            {title}
          </div>
          <div style={{
            fontFamily: font, fontWeight: 500, fontSize: 15, color: "#343E5B", lineHeight: 1.3,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {body}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
