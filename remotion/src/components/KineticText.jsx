import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// Upgraded from a flat fade+translateY (fixed fontSize:64 regardless of
// orientation, no emphasis, no living hold) to a real "motion-blur settle"
// gesture - rise + blur + scale resolving together as one move, exactly as
// each word is spoken. Ported/adapted from a reference motion-graphics
// skill's kinetic-type approach. All existing props (`text`, `wordTimings`,
// `durationInFrames`, `backgroundColor`, `font`) still work unchanged -
// this is additive, not a breaking rewrite.
//
// wordTimings entries can now optionally carry `emphasis: true` for a key
// word - it renders in `accentColor` with a brief landing overshoot and a
// soft glow, same "one accent reserved for the single emphasized element"
// discipline used elsewhere in this library.
//
// `overlay: true` renders as a lower-third-anchored caption over footage
// (auto-shrinks to fit on one line, soft bottom scrim, speaker stays fully
// visible) instead of a full-screen takeover on `backgroundColor`.
export const KineticText = ({
  text,
  wordTimings, // [{ startFrame, emphasis? }] - one entry per word, in order
  durationInFrames,
  backgroundColor = "#000000",
  accentColor = "#4ADE80",
  font = "ui",
  overlay = false,
  fontSize, // optional explicit override - if omitted, auto-scales to orientation
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const perWord = durationInFrames / words.length;
  const typeBase = Math.min(width, height);

  let baseFontSize = fontSize ?? Math.round(typeBase * (overlay ? 0.072 : 0.084));
  if (overlay && !fontSize) {
    // Auto-shrink so the whole line fits on one row without wrapping -
    // wrapping in overlay mode leaves dead space and looks like an
    // afterthought rather than a designed caption.
    const totalChars = words.reduce((s, w) => s + w.length, 0);
    const gaps = Math.max(0, words.length - 1);
    const avail = width * 0.9;
    const fitted = avail / (0.56 * totalChars + 0.3 * gaps);
    baseFontSize = Math.round(Math.min(baseFontSize, fitted));
  }

  // Continuous idle drift on the whole block once it's held - never a
  // frozen frame during the hold.
  const holdK = interpolate(frame, [0, Math.round(fps * 4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const holdScale = 1 + 0.018 * holdK;
  const holdTy = -6 * holdK;

  // Choreographed exit over the scene's final 0.5s - dissolve forward
  // rather than a flat cut.
  const exitDurF = Math.round(fps * 0.5);
  const exitStartF = Math.max(0, durationInFrames - exitDurF);
  const exitP = interpolate(frame, [exitStartF, exitStartF + exitDurF], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitOpacity = 1 - exitP;
  const exitBlur = exitP * 10;
  const exitScale = 1 + exitP * 0.04;
  const exitTy = -exitP * 14;

  return (
    <AbsoluteFill style={{ backgroundColor: overlay ? "transparent" : backgroundColor }}>
      {overlay ? (
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,10,15,0) 45%, rgba(8,10,15,0) 55%, rgba(8,10,15,0.62) 100%)" }} />
      ) : null}
      <AbsoluteFill style={{
        display: "flex", alignItems: overlay ? "flex-end" : "center", justifyContent: "center",
        padding: width * 0.09, paddingBottom: overlay ? height * 0.05 : width * 0.09,
        opacity: exitOpacity, filter: exitBlur > 0.05 ? `blur(${exitBlur}px)` : undefined,
        transform: `translateY(${holdTy + exitTy}px) scale(${holdScale * exitScale})`,
      }}>
        <div style={{
          display: "flex", flexWrap: overlay ? "nowrap" : "wrap",
          gap: `${baseFontSize * 0.2}px ${baseFontSize * 0.3}px`,
          justifyContent: "center", alignItems: "baseline",
          maxWidth: overlay ? "96%" : "86%", textAlign: "center",
          whiteSpace: overlay ? "nowrap" : undefined,
        }}>
          {words.map((word, i) => {
            const wt = wordTimings?.[i];
            const start = wt?.startFrame ?? i * perWord;
            const emph = !!wt?.emphasis;
            const localFrame = frame - start;
            const k = interpolate(localFrame, [0, Math.round(fps * 0.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            const rise = (1 - k) * baseFontSize * 0.42;
            const blur = (1 - k) * 13;
            const enterScale = 0.92 + 0.08 * k;

            const s = spring({ frame: localFrame, fps, durationInFrames: Math.round(fps * 0.45), config: { damping: 11, stiffness: 170, mass: 0.7 } });
            const overshoot = emph ? 1 + 0.08 * (localFrame > 0 ? Math.sin(Math.min(1, s) * Math.PI) : 0) : 1;

            const color = emph ? accentColor : "#FFFFFF";
            const shadow = emph
              ? `0 2px 3px rgba(0,0,0,0.95), 0 ${baseFontSize * 0.06}px ${baseFontSize * 0.22}px rgba(0,0,0,0.75), 0 0 ${baseFontSize * 0.34}px ${accentColor}59`
              : `0 2px 3px rgba(0,0,0,0.9), 0 ${baseFontSize * 0.06}px ${baseFontSize * 0.24}px rgba(0,0,0,0.6)`;

            return (
              <span key={i} style={{
                display: "inline-block", fontFamily: resolveFont(font), fontWeight: 700,
                fontSize: baseFontSize, lineHeight: 1.12, letterSpacing: "-0.02em",
                color, opacity: k, textShadow: shadow,
                transform: `translateY(${rise}px) scale(${enterScale * overshoot})`,
                transformOrigin: "center bottom",
                filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
                whiteSpace: "pre",
              }}>
                {word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
