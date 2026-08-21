import { computeMotion } from "../motion";
import { resolveFont } from "../fonts";
import { useCurrentFrame, useVideoConfig } from "remotion";

// Closes a real gap: the CapCut/kinetic-text style where several words in
// one sentence each get their own size/weight/color for emphasis rhythm
// (e.g. "without WASTING hours" - small / huge-italic / medium). Text only
// supports one size/weight per object, so this look previously had to be
// hand-built from several separately-positioned Text objects per sentence,
// which is tedious to redo scene after scene and easy to misalign.
//
// `runs` is an ordered array of words/phrases that inline-wrap like a
// paragraph (not independently positioned) - closer to a rich-text span
// than a layout tool. Each run can override size/weight/color/font/style
// independently; anything omitted falls back to the top-level default.
export const MixedText = ({
  runs = [], // [{ text, size, weight, color, font, italic, animations }]
  x = 50,
  y = 50,
  align = "center",
  maxWidth = 80, // percent
  gap = 12, // px between runs
  size = 48, // default size for any run that doesn't set its own
  weight = 700,
  color = "#FFFFFF",
  font = "ui",
  animations = [{ type: "fadeIn", start: 0, duration: 15 }],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The container's own entrance (fadeIn/slideIn/etc, same motion engine
  // as every other primitive) - applied once to the whole block.
  const { style, positionOverride } = computeMotion(animations, frame, fps);
  const posX = positionOverride?.x ?? x;
  const posY = positionOverride?.y ?? y;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) ${style.transform}`,
        opacity: style.opacity,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        alignItems: "baseline",
        columnGap: gap,
        rowGap: gap * 0.5,
        maxWidth: `${maxWidth}%`,
        textAlign: align,
      }}
    >
      {runs.map((run, i) => {
        // Each run can ALSO carry its own `animations` (e.g. stagger the
        // words in one at a time) - resolved independently of the
        // container's own entrance animation above.
        const runMotion = run.animations ? computeMotion(run.animations, frame, fps) : null;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize: run.size ?? size,
              fontWeight: run.weight ?? weight,
              fontStyle: run.italic ? "italic" : "normal",
              color: run.color ?? color,
              fontFamily: resolveFont(run.font ?? font),
              opacity: runMotion ? runMotion.style.opacity : 1,
              transform: runMotion ? runMotion.style.transform : "none",
              textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {run.text}
          </span>
        );
      })}
    </div>
  );
};
