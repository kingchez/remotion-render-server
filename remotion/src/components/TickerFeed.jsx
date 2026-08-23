import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// TICKER FEED — a scrolling activity log. New items appear at the TOP of a
// stack; older items slide DOWN one slot each time a newer item lands;
// once an item is pushed past `visibleSlots`, it fades out. Ported/adapted
// from a reference motion-graphics skill. Genuinely useful for "here's
// what my automation/routine just did" (a sequence of discrete events) or
// a chat/notification stream - distinct from ProgressSteps (tracks ONE
// process through fixed stages) and DataFlowPipes (shows structural flow,
// not a log of discrete events).
//
// items: [{ text, appearAtSec? }]
export const TickerFeed = ({
  items = [],
  visibleSlots = 4,
  anchor = "top-right", // "top-right" | "top-left"
  accentColor = "#4ADE80",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);
  if (!items.length) return null;

  const panelW = width * 0.34;
  const rowH = Math.round(typeBase * 0.048);
  const margin = Math.round(typeBase * 0.04);
  const left = anchor === "top-left" ? margin : width - panelW - margin;
  const top = margin;

  const totalSec = (durationInFrames ?? items.length * 20) / fps;
  const cadence = Math.max(0.6, (totalSec * 0.85) / items.length);
  const norm = items.map((it, i) => ({ ...it, appearAtSec: typeof it.appearAtSec === "number" ? it.appearAtSec : cadence * i }));
  const appearFrames = norm.map((it) => Math.round(it.appearAtSec * fps));

  return (
    <div style={{ position: "absolute", left, top, width: panelW, height: rowH * (visibleSlots + 1), overflow: "hidden" }}>
      {norm.map((it, i) => {
        const appearF = appearFrames[i];
        if (frame < appearF) return null;

        // Newer items (index > i) that have already appeared each push this
        // row down one slot. Find the frame of the most recent such pusher -
        // that's when this row's target slot most recently changed.
        const pushers = appearFrames.slice(i + 1).filter((f) => f <= frame);
        const slot = pushers.length;
        if (slot > visibleSlots) return null;
        const lastChangeF = slot === 0 ? appearF : pushers[pushers.length - 1];

        const posK = interpolate(frame, [lastChangeF, lastChangeF + Math.round(fps * 0.35)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const fromY = slot === 0 ? -rowH * 0.6 : (slot - 1) * rowH;
        const toY = slot * rowH;
        const y = interpolate(posK, [0, 1], [fromY, toY]);

        const entryOpacity = interpolate(frame, [appearF, appearF + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const exitOpacity = slot === visibleSlots ? interpolate(posK, [0, 1], [1, 0]) : 1;
        const opacity = entryOpacity * exitOpacity;

        return (
          <div key={i} style={{
            position: "absolute", left: 0, top: 0, width: "100%", height: rowH - 6,
            transform: `translateY(${y}px)`, opacity,
            background: "rgba(15,18,26,0.85)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            display: "flex", alignItems: "center", padding: `0 ${typeBase * 0.016}px`, gap: 8,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, flexShrink: 0 }} />
            <div style={{
              fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.018), color: "#E6EBF4",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {it.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
