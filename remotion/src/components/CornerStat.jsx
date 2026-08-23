import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// CORNER STAT — a persistent stat HUD anchored to a frame corner while
// whatever's underneath (a talking-head clip, a screen recording) stays
// fully visible. Ported/adapted from a reference motion-graphics skill.
// The exact tool for "as I mention this number, the actual value stays on
// screen the whole time" - distinct from DataViz/StatPunch/StatGrid, which
// are all full-frame takeovers. Genuinely useful for explaining a
// parameter while the thing being explained (a UI, a person talking)
// keeps being shown.
export const CornerStat = ({
  preLabel,
  value,
  caption,
  delta,
  anchor = "top-right",
  accentColor = "#4ADE80",
  font = "ui",
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);

  const cardW = Math.round(width * 0.22);
  const cardPad = Math.round(typeBase * 0.02);
  const cardRadius = Math.round(typeBase * 0.014);
  const margin = Math.round(typeBase * 0.04);
  const valueSize = Math.round(typeBase * 0.068);
  const labelSize = Math.round(typeBase * 0.022);
  const captionSize = Math.round(typeBase * 0.024);
  const deltaSize = Math.round(typeBase * 0.022);

  let left, top, slideFromX = 0, slideFromY = 0;
  if (anchor === "top-right") { left = width - cardW - margin; top = margin; slideFromX = cardW * 0.6; }
  else if (anchor === "top-left") { left = margin; top = margin; slideFromX = -cardW * 0.6; }
  else if (anchor === "bottom-right") { left = width - cardW - margin; top = height - margin - typeBase * 0.16; slideFromX = cardW * 0.6; }
  else { left = margin; top = height - margin - typeBase * 0.16; slideFromX = -cardW * 0.6; }

  const slideSpring = spring({ frame, fps, durationInFrames: Math.round(fps * 0.5), config: { damping: 17, stiffness: 130, mass: 0.7 } });
  const slideX = interpolate(slideSpring, [0, 1], [slideFromX, 0]);
  const valueScale = interpolate(spring({ frame: frame - Math.round(fps * 0.2), fps, durationInFrames: Math.round(fps * 0.4), config: { damping: 14, stiffness: 170, mass: 0.6 } }), [0, 1], [0.85, 1]);
  const deltaK = interpolate(frame, [Math.round(fps * 0.45), Math.round(fps * 0.7)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const settleK = interpolate(frame, [Math.round(fps * 1.0), Math.round(fps * 2.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const settleScale = 1 + 0.015 * settleK;

  const isPositiveDelta = delta && /^[+↑]/.test(delta);

  return (
    <div style={{
      position: "absolute", left, top, width: cardW, padding: cardPad,
      borderRadius: cardRadius, background: "rgba(15,18,26,0.88)", backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
      opacity: slideSpring, transform: `translateX(${slideX}px) scale(${settleScale})`,
      fontFamily: resolveFont(font),
    }}>
      {preLabel ? (
        <div style={{ fontSize: labelSize, fontWeight: 700, color: "#8A95B3", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
          {preLabel}
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: valueSize, fontWeight: 800, color: "#FFFFFF", lineHeight: 1, transform: `scale(${valueScale})`, transformOrigin: "left center" }}>
          {value}
        </div>
        {delta ? (
          <div style={{ fontSize: deltaSize, fontWeight: 700, color: isPositiveDelta ? accentColor : "#9AA3AB", opacity: deltaK }}>
            {delta}
          </div>
        ) : null}
      </div>
      {caption ? <div style={{ fontSize: captionSize, fontWeight: 500, color: "#C7CDD9", marginTop: 4 }}>{caption}</div> : null}
    </div>
  );
};
