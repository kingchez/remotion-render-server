import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// STAT PUNCH — a static hero-number impact card (no count-up; for that use
// DataViz). Ported/adapted from a reference motion-graphics skill, whose
// own changelog flagged a real auto-fit bug worth carrying the fix for:
// sizing by average-character-width alone underestimates real glyph width
// for a mostly-uppercase, tightly-tracked hero string, so it can silently
// bleed past the frame edge on wide words. Sizing here is done against the
// LONGEST WORD (not the whole string) with a calibrated width factor,
// which is what actually prevents overflow regardless of total length.
export const StatPunch = ({
  value,
  caption,
  preLabel,
  accentColor = "#4ADE80",
  font = "ui",
}) => {
  const { fps, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = width;

  const labelK = interpolate(frame, [0, Math.round(fps * 0.45)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const valueSpring = spring({ frame: frame - Math.round(fps * 0.2), fps, durationInFrames: Math.round(fps * 0.55), config: { damping: 16, stiffness: 130, mass: 0.7 } });
  const settleStartF = Math.round(fps * 0.55);
  const settleK = interpolate(frame, [settleStartF, settleStartF + Math.round(fps * 1.8)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const settleScale = 1 + 0.03 * settleK;
  const captionK = interpolate(frame, [Math.round(fps * 0.45), Math.round(fps * 0.95)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const valueWords = value.split(/\s+/);
  const longestWordLen = Math.max(1, ...valueWords.map((w) => w.length));
  const AVG_CHAR_FACTOR = 0.65; // calibrated against a bold, tightly-tracked hero font - not a plain average-char guess
  const SAFE_FRAME_FRACTION = 0.8;
  const maxFontByWord = (width * SAFE_FRAME_FRACTION) / (longestWordLen * AVG_CHAR_FACTOR);
  const heroFontSize = Math.round(Math.min(typeBase * 0.32, maxFontByWord));

  return (
    <AbsoluteFill style={{ backgroundColor: "#101820" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: width * 0.05, textAlign: "center" }}>
        {preLabel ? (
          <div style={{ fontFamily: resolveFont(font), fontWeight: 700, fontSize: Math.round(width * 0.028), color: "#8A95B3", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16, opacity: labelK }}>
            {preLabel}
          </div>
        ) : null}
        <div style={{
          fontFamily: resolveFont(font), fontWeight: 800, fontSize: heroFontSize, color: "#FFFFFF",
          lineHeight: 0.95, letterSpacing: "-0.02em", opacity: valueSpring,
          transform: `scale(${(0.85 + 0.15 * valueSpring) * settleScale})`,
        }}>
          {value}
        </div>
        {caption ? (
          <div style={{ fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(width * 0.032), color: accentColor, marginTop: 24, maxWidth: width * 0.7, opacity: captionK }}>
            {caption}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
