import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";
import { normalizeAssetUrl } from "../assetUrl";

// SIDE PANEL — a persistent vertical split: footage (a talking-head clip or
// screen recording) fills one side, a structured info panel builds on the
// other. Ported/adapted from a reference motion-graphics skill. For "as I'm
// talking, here's the structured info" - bullet points, a mini-checklist, a
// fact stack - with less visual weight than a full takeover, while keeping
// whatever's underneath fully visible on its own side rather than
// overlaid/composited on top of it.
//
// items: [{ text, appearAtSec? }]
export const SidePanel = ({
  title,
  items = [],
  footageUrl, // optional - if omitted, the footage side is left as a solid panel (compose the real clip underneath in the scene instead)
  footageSide = "left", // "left" | "right"
  panelFraction = 0.4,
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const footage = footageUrl ? normalizeAssetUrl(footageUrl) : null;

  const panelW = width * panelFraction;
  const panelLeft = footageSide === "left" ? width - panelW : 0;
  const slideFromX = footageSide === "left" ? panelW : -panelW;

  const panelSpring = spring({ frame, fps, durationInFrames: Math.round(fps * 0.5), config: { damping: 18, stiffness: 120, mass: 0.8 } });
  const panelX = interpolate(panelSpring, [0, 1], [slideFromX, 0]);

  const titleK = interpolate(frame, [Math.round(fps * 0.3), Math.round(fps * 0.55)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const totalSec = (durationInFrames ?? items.length * 25) / fps;
  const span = totalSec * 0.6;
  const norm = items.map((it, i) => ({ ...it, appearAtSec: typeof it.appearAtSec === "number" ? it.appearAtSec : totalSec * 0.15 + (span / Math.max(1, items.length)) * i }));

  return (
    <AbsoluteFill>
      {footage ? (
        <div style={{ position: "absolute", [footageSide]: 0, top: 0, width: width - panelW, height: "100%", overflow: "hidden" }}>
          <Img src={footage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : null}
      <div style={{
        position: "absolute", left: panelLeft, top: 0, width: panelW, height: "100%",
        backgroundColor: "#0F121A", padding: typeBase * 0.03, boxSizing: "border-box",
        transform: `translateX(${panelX}px)`, borderLeft: footageSide === "left" ? `2px solid ${accentColor}` : "none",
        borderRight: footageSide === "right" ? `2px solid ${accentColor}` : "none",
      }}>
        {title ? (
          <div style={{
            fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.028), color: "#FFFFFF",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: typeBase * 0.03,
            opacity: titleK, transform: `translateY(${(1 - titleK) * 10}px)`,
          }}>
            {title}
          </div>
        ) : null}
        {norm.map((it, i) => {
          const appearF = Math.round(it.appearAtSec * fps);
          if (frame < appearF) return null;
          const s = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(fps * 0.4), config: { damping: 15, stiffness: 170, mass: 0.6 } });
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: typeBase * 0.012, marginBottom: typeBase * 0.018,
              opacity: s, transform: `translateX(${(1 - s) * -14}px)`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor, marginTop: typeBase * 0.008, flexShrink: 0 }} />
              <div style={{ fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.022), color: "#E6EBF4", lineHeight: 1.3 }}>
                {it.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
