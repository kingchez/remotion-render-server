import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// CINEMATIC TITLE — a chapter-divider transition for long-form content.
// Ported/adapted from a reference motion-graphics skill. Use BETWEEN major
// sections of a 5+ minute video to give a clear "we're moving to the next
// part" signal - a curtain wipe, a small kicker label, and a large chapter
// number/title slamming in from below. This is a TRANSITION device, meant
// to be brief (2-3s), not a held explainer scene.
export const CinematicTitle = ({
  kicker,
  chapterNumber,
  title,
  accentColor = "#4ADE80",
  font = "display",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);

  const curtainK = interpolate(frame, [0, Math.round(fps * 0.35)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kickerK = interpolate(frame, [Math.round(fps * 0.2), Math.round(fps * 0.45)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const numberK = interpolate(frame, [Math.round(fps * 0.35), Math.round(fps * 0.65)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const numberScale = interpolate(numberK, [0, 1], [1.3, 1]);
  const titleK = interpolate(frame, [Math.round(fps * 0.5), Math.round(fps * 0.75)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const total = durationInFrames ?? 75;
  const exitStartF = Math.max(0, total - Math.round(fps * 0.35));
  const exitK = interpolate(frame, [exitStartF, total], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F121A", opacity: 1 - exitK }}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: width * 0.08, clipPath: `inset(0 ${(1 - curtainK) * 100}% 0 0)`,
      }}>
        {kicker ? (
          <div style={{
            fontFamily: resolveFont("ui"), fontWeight: 700, fontSize: Math.round(typeBase * 0.03), color: accentColor,
            textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: typeBase * 0.02,
            opacity: kickerK, transform: `translateY(${(1 - kickerK) * 10}px)`,
          }}>
            {kicker}
          </div>
        ) : null}
        {chapterNumber ? (
          <div style={{
            fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.14), color: accentColor,
            lineHeight: 0.9, opacity: numberK, transform: `scale(${numberScale})`,
          }}>
            {chapterNumber}
          </div>
        ) : null}
        <div style={{
          fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.06), color: "#FFFFFF",
          lineHeight: 1.05, marginTop: typeBase * 0.02, maxWidth: width * 0.78,
          opacity: titleK, transform: `translateY(${(1 - titleK) * 16}px)`,
        }}>
          {title}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
