import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// words: [{ word, start, end }] - real WhisperX timestamps, in SECONDS,
// relative to the start of this scene's own audio (not the whole video).
// This renders on top of any other scene as an overlay - pair it with
// Screencast, KenBurnsImage, etc. by including it as an extra scene layer,
// or use it as its own full scene over a solid/blurred background.
export const AnimatedCaptions = ({
  words,
  fontSize = 64,
  activeColor = "#FFD400",
  inactiveColor = "#FFFFFF",
  wordsPerLine = 5,
  position = "bottom", // "bottom" | "center" | "top"
  font = "ui",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Group words into short lines (like real caption software) instead of
  // one giant paragraph - reads much closer to Submagic/CapCut style.
  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine));
  }

  // Find which line is currently active based on real timing
  const activeLineIndex = lines.findIndex(
    (line) => currentTime >= line[0].start && currentTime <= line[line.length - 1].end + 0.3
  );
  const visibleLine = lines[activeLineIndex] ?? (currentTime < words[0]?.start ? lines[0] : null);

  if (!visibleLine) return null;

  const justifyContent = position === "bottom" ? "flex-end" : position === "top" ? "flex-start" : "center";
  const padding = position === "bottom" ? { paddingBottom: 140 } : position === "top" ? { paddingTop: 140 } : {};

  return (
    <AbsoluteFill style={{ justifyContent, alignItems: "center", ...padding }}>
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14,
        maxWidth: "85%", padding: "10px 24px",
      }}>
        {visibleLine.map((w, i) => {
          const isActive = currentTime >= w.start && currentTime <= w.end;
          const hasPassed = currentTime > w.end;
          // Pop-scale when a word becomes active, settles back to normal size
          const popProgress = interpolate(
            currentTime, [w.start, w.start + 0.08], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const scale = isActive ? 1 + 0.15 * (1 - popProgress) + 0.0 : 1;
          return (
            <span key={i} style={{
              fontSize, fontWeight: 800, fontFamily: resolveFont(font),
              color: isActive || hasPassed ? activeColor : inactiveColor,
              transform: `scale(${isActive ? 1.12 : 1})`,
              textShadow: "0 3px 10px rgba(0,0,0,0.7)",
              transition: "none",
            }}>
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
