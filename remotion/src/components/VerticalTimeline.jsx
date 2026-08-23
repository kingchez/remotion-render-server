import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// VERTICAL TIMELINE — distinct from Timeline (a horizontal line-with-dots):
// a downward rail where the rail's own leading edge is keyframed so it
// reaches each dot's Y position at the EXACT frame that dot pops in - the
// line never races ahead of or lags the points, since dot cadence and rail
// speed are the same clock. Ported/adapted from a reference motion-graphics
// skill. Use for a numbered/dated list of milestones read top-to-bottom
// ("first this happened, then this, then this") as an alternative to the
// horizontal Timeline when a vertical list reads more naturally.
//
// items: [{ heading, description?, appearAtSec? }]
export const VerticalTimeline = ({
  title,
  items = [],
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const N = Math.max(1, items.length);
  const typeBase = Math.min(width, height);

  const padX = width * 0.08;
  const padTop = height * 0.085;
  const titleSize = Math.round(typeBase * 0.052);
  const headingSize = Math.round(typeBase * 0.038);
  const descSize = Math.round(typeBase * 0.026);
  const dotSize = Math.round(typeBase * 0.03);
  const railW = Math.max(3, Math.round(typeBase * 0.008));
  const rowH = height * 0.135;
  const titleBlockH = title ? titleSize * 1.2 + height * 0.045 : 0;
  const contentTop = padTop + titleBlockH;

  const totalSec = (durationInFrames ?? N * 45) / fps;
  const span = totalSec * 0.7;
  const norm = items.map((it, i) => ({
    ...it,
    appearAtSec: typeof it.appearAtSec === "number" ? it.appearAtSec : (span / N) * i,
  }));

  const dotY = (i) => contentTop + rowH * i + rowH * 0.3;
  const lastDotY = dotY(N - 1);
  const railBottomTarget = lastDotY;

  // Rail head position: piecewise-linear, keyframed to reach dotY(i) exactly
  // at appearAtSec(i)'s frame - guarantees the rail never outpaces the dots.
  const railHeadY = (() => {
    const keyframes = norm.map((it, i) => ({ f: Math.round(it.appearAtSec * fps), y: dotY(i) }));
    if (frame <= keyframes[0].f) return contentTop;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (frame >= keyframes[i].f && frame <= keyframes[i + 1].f) {
        return interpolate(frame, [keyframes[i].f, keyframes[i + 1].f], [keyframes[i].y, keyframes[i + 1].y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      }
    }
    return railBottomTarget;
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F1115", padding: `${padTop}px ${padX}px` }}>
      {title ? (
        <div style={{ fontFamily: resolveFont(font), fontWeight: 800, fontSize: titleSize, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {title}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: padX + dotSize / 2, top: contentTop, width: railW, height: railBottomTarget - contentTop, background: "rgba(255,255,255,0.12)" }} />
      <div style={{ position: "absolute", left: padX + dotSize / 2, top: contentTop, width: railW, height: Math.max(0, railHeadY - contentTop), background: accentColor }} />
      {norm.map((it, i) => {
        const y = dotY(i);
        const appearF = Math.round(it.appearAtSec * fps);
        const visible = frame >= appearF;
        const pop = interpolate(frame, [appearF, appearF + 10], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: padX, top: y - dotSize / 2, opacity: visible ? 1 : 0, transform: `scale(${pop})`, display: "flex", alignItems: "flex-start", gap: typeBase * 0.02 }}>
            <div style={{ width: dotSize, height: dotSize, borderRadius: "50%", background: accentColor, flexShrink: 0, boxShadow: `0 0 0 6px ${accentColor}33` }} />
            <div>
              <div style={{ fontFamily: resolveFont(font), fontWeight: 700, fontSize: headingSize, color: "#FFFFFF" }}>{it.heading}</div>
              {it.description ? <div style={{ fontFamily: resolveFont(font), fontWeight: 500, fontSize: descSize, color: "#9AA3AB", marginTop: 4, maxWidth: width * 0.6 }}>{it.description}</div> : null}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
