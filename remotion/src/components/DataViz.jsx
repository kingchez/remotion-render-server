import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// Upgraded from a flat linear count-up (fixed fontSize:100, no tabular-nums
// so digit width jittered as it counted, no landing settle) to a real
// count-up hero-number component. Ported/adapted from a reference motion-
// graphics skill. All existing props (`label`, `value`, `maxValue`, `unit`,
// `durationInFrames`, `font`) still work unchanged - this is additive.
//
// New optional props: `preLabel` (small caption above, e.g. "MRR"),
// `prefix`/`suffix` (render as accent-colored pill badges either side of
// the number, e.g. prefix:"$" suffix:"/mo"), `decimals` (fixed decimal
// places so the layout doesn't reflow mid-roll).
export const DataViz = ({
  label,
  preLabel,
  value,
  maxValue,
  unit = "",
  prefix,
  suffix,
  decimals = 0,
  durationInFrames,
  accentColor = "#4ADE80",
  font = "ui",
}) => {
  const { fps, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, 1920);

  const rollStartSec = 0.2;
  const rollDurSec = Math.min(1.2, Math.max(0.5, (durationInFrames / fps) * 0.5));
  const k = interpolate(frame / fps, [rollStartSec, rollStartSec + rollDurSec], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.65, 0.2, 1.0),
  });
  const current = value * k;
  const formatted = current.toFixed(decimals);
  const [intPart, decPart] = formatted.split(".");
  const intWithSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const displayValue = decPart != null ? `${intWithSep}.${decPart}` : intWithSep;

  // Auto-fit hero font size against the LONGEST final string, so it never
  // overflows regardless of digit count.
  const finalIntPart = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const finalStr = `${prefix ?? ""}${finalIntPart}${decimals ? "." + "0".repeat(decimals) : ""}${suffix ?? unit ?? ""}`;
  const maxByWord = (width * 0.8) / (Math.max(1, finalStr.length) * 0.62);
  const heroFontSize = Math.round(Math.min(typeBase * 0.3, maxByWord));

  const counterSpring = spring({ frame: frame - Math.round(fps * 0.1), fps, durationInFrames: Math.round(fps * 0.5), config: { damping: 16, stiffness: 130, mass: 0.7 } });
  const settleStartF = Math.round((rollStartSec + rollDurSec) * fps);
  const settleK = interpolate(frame, [settleStartF, settleStartF + Math.round(fps * 1.5)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const settleScale = 1 + 0.025 * settleK;

  const captionK = interpolate(frame, [Math.round(fps * 0.55), Math.round(fps * 1.0)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelK = interpolate(frame, [0, Math.round(fps * 0.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const badgeStyle = {
    fontFamily: resolveFont(font), fontWeight: 700, color: accentColor, lineHeight: 1.0,
    letterSpacing: "-0.01em", padding: `${Math.round(heroFontSize * 0.08)}px ${Math.round(heroFontSize * 0.14)}px`,
    backgroundColor: "#1E2434", borderRadius: Math.round(heroFontSize * 0.1), display: "inline-block",
    boxShadow: `0 ${Math.round(heroFontSize * 0.015)}px ${Math.round(heroFontSize * 0.04)}px rgba(15,18,26,0.2)`,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#101820", justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", width: "80%" }}>
        {preLabel ? (
          <div style={{
            fontFamily: resolveFont(font), fontWeight: 700, fontSize: Math.round(typeBase * 0.034),
            color: "#B5BFC2", textTransform: "uppercase", letterSpacing: "0.12em",
            marginBottom: Math.round(typeBase * 0.02), opacity: labelK,
          }}>
            {preLabel}
          </div>
        ) : null}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "center", gap: Math.round(typeBase * 0.005),
          opacity: counterSpring, transform: `scale(${(0.85 + 0.15 * counterSpring) * settleScale})`,
        }}>
          {prefix ? <span style={{ ...badgeStyle, fontSize: Math.round(heroFontSize * 0.4), alignSelf: "flex-start", marginTop: Math.round(heroFontSize * 0.12), marginRight: Math.round(typeBase * 0.008) }}>{prefix}</span> : null}
          <span style={{
            fontFamily: resolveFont(font), fontWeight: 800, fontSize: heroFontSize, color: "#E9ECED",
            lineHeight: 0.85, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
          }}>
            {displayValue}{!prefix && !suffix ? unit : ""}
          </span>
          {suffix ? <span style={{ ...badgeStyle, fontSize: Math.round(heroFontSize * 0.36), alignSelf: "flex-end", marginBottom: Math.round(heroFontSize * 0.1), marginLeft: Math.round(typeBase * 0.008) }}>{suffix}</span> : null}
        </div>
        {maxValue ? (
          <div style={{ height: 24, background: "#2A3040", borderRadius: 12, marginTop: 20, overflow: "hidden", width: "100%" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (current / maxValue) * 100)}%`, background: accentColor }} />
          </div>
        ) : null}
        {label ? (
          <div style={{
            fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.04),
            color: "#B5BFC2", lineHeight: 1.25, marginTop: Math.round(typeBase * 0.04), opacity: captionK,
          }}>
            {label}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
