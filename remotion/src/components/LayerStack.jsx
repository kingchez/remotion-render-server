import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// LAYER STACK — an "under the hood" architecture stack. Ported/adapted
// from a reference motion-graphics skill. When a script enumerates the
// layers of a system ("the infrastructure, the AI behind it, the
// self-learning mechanism") a flat chip/tag row reads as a list, not a
// SYSTEM - this instead stacks the layers as physical slabs, foundation
// at the bottom, building UP one slab at a time as each is named, so the
// viewer literally sees the architecture assemble. The top slab (usually
// the payoff/outcome layer) lands in the accent color.
//
// layers: [{ label, description?, appearAtSec? }] - first entry = bottom/foundation
export const LayerStack = ({
  title,
  layers = [],
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  const N = Math.min(6, layers.length);
  if (!N) return null;

  const titleBarH = title ? Math.round(height * 0.1) : 0;
  const stackW = width * 0.62;
  const stackBottom = height * 0.9;
  const stackTop = titleBarH + height * 0.08;
  const slabH = Math.min(height * 0.13, (stackBottom - stackTop) / N - 10);
  const gap = 10;

  const totalSec = (durationInFrames ?? N * 30) / fps;
  const span = totalSec * 0.75;
  const norm = layers.slice(0, N).map((l, i) => ({ ...l, appearAtSec: typeof l.appearAtSec === "number" ? l.appearAtSec : (span / N) * i }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F121A" }}>
      {title ? (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: titleBarH, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.036), color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </div>
      ) : null}
      {norm.map((l, i) => {
        // Index 0 is the bottom/foundation slab - render position from bottom up.
        const yFromBottom = i * (slabH + gap);
        const top = stackBottom - yFromBottom - slabH;
        const isTop = i === N - 1;
        const appearF = Math.round(l.appearAtSec * fps);
        if (frame < appearF) return null;
        const s = spring({ frame: frame - appearF, fps, durationInFrames: Math.round(fps * 0.45), config: { damping: 13, stiffness: 150, mass: 0.7 } });
        const riseFrom = 60;
        const ty = (1 - s) * riseFrom;
        const breathe = isTop ? 1 + 0.012 * Math.sin(((frame - appearF) / fps) * Math.PI * 1.3) : 1;

        return (
          <div key={i} style={{
            position: "absolute", left: (width - stackW) / 2, top, width: stackW, height: slabH,
            borderRadius: typeBase * 0.012, background: isTop ? accentColor : "#1E2434",
            border: isTop ? "none" : "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", padding: `0 ${typeBase * 0.024}px`,
            opacity: s, transform: `translateY(${ty}px) scale(${breathe})`,
            boxShadow: isTop ? `0 10px 30px ${accentColor}44` : "0 6px 16px rgba(0,0,0,0.3)",
          }}>
            <div>
              <div style={{ fontFamily: resolveFont(font), fontWeight: 800, fontSize: Math.round(typeBase * 0.026), color: isTop ? "#0F121A" : "#FFFFFF" }}>
                {l.label}
              </div>
              {l.description ? (
                <div style={{ fontFamily: resolveFont(font), fontWeight: 500, fontSize: Math.round(typeBase * 0.018), color: isTop ? "rgba(15,18,26,0.7)" : "#9AA3AB", marginTop: 2 }}>
                  {l.description}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
