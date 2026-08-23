import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";
import { normalizeAssetUrl } from "../assetUrl";

// SPLIT REVEAL — a cinematic before/after WIPE (a transition, not a static
// side-by-side comparison - see SplitCompare for the static version).
// Two images stacked; an animated divider sweeps across, progressively
// revealing the AFTER image underneath the BEFORE image. Ported/adapted
// from a reference motion-graphics skill. Use this specifically as a
// TRANSITION beat between "the old way" and "the new way", not as a held
// comparison shot.
export const SplitReveal = ({
  beforeUrl,
  afterUrl,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  direction = "horizontal", // "horizontal" | "vertical"
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const before = normalizeAssetUrl(beforeUrl);
  const after = normalizeAssetUrl(afterUrl);

  const total = durationInFrames ?? 90;
  const wipeStartF = Math.round(fps * 0.4);
  const wipeDurF = Math.round((total - wipeStartF) * 0.55);
  const wipeK = interpolate(frame, [wipeStartF, wipeStartF + wipeDurF], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const beforeChipK = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const afterChipK = interpolate(frame, [wipeStartF - 10, wipeStartF + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const beforeChipOut = interpolate(frame, [wipeStartF, wipeStartF + 15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const clipPct = wipeK * 100;
  const clipPath = direction === "horizontal" ? `inset(0 0 0 ${clipPct}%)` : `inset(${clipPct}% 0 0 0)`;
  const dividerPos = direction === "horizontal" ? { left: `${clipPct}%`, top: 0, width: 4, height: "100%" } : { top: `${clipPct}%`, left: 0, height: 4, width: "100%" };

  const chipStyle = (k, side) => ({
    position: "absolute", top: side === "before" ? height * 0.06 : undefined, bottom: side === "after" ? height * 0.06 : undefined,
    [side === "before" ? "left" : "right"]: width * 0.06,
    background: side === "before" ? "#1E2434" : accentColor, color: side === "before" ? "#FFFFFF" : "#0F121A",
    fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.024),
    padding: `${typeBase * 0.01}px ${typeBase * 0.02}px`, borderRadius: 6, letterSpacing: "0.05em",
    opacity: k, transform: `translateX(${side === "before" ? (1 - k) * -30 : (1 - k) * 30}px)`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F121A", overflow: "hidden" }}>
      {before ? <Img src={before} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      {after ? <Img src={after} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", clipPath }} /> : null}
      {wipeK > 0.001 && wipeK < 0.999 ? (
        <div style={{ position: "absolute", ...dividerPos, background: accentColor, boxShadow: `0 0 20px ${accentColor}` }} />
      ) : null}
      <div style={{ opacity: beforeChipOut }}><div style={chipStyle(beforeChipK, "before")}>{beforeLabel}</div></div>
      <div style={chipStyle(afterChipK, "after")}>{afterLabel}</div>
    </AbsoluteFill>
  );
};
