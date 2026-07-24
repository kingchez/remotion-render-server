import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

// Splits text into words and reveals them evenly across the scene duration.
// If wordTimings is provided (from real voiceover alignment later), it's used
// instead of the even-split fallback for exact sync.
export const KineticText = ({ text, wordTimings, durationInFrames, backgroundColor = "#000000", font = "ui"}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const perWord = durationInFrames / words.length;

  return (
    <AbsoluteFill style={{ backgroundColor, justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
        {words.map((word, i) => {
          const start = wordTimings ? wordTimings[i]?.startFrame ?? i * perWord : i * perWord;
          const opacity = interpolate(frame, [start, start + 6], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [start, start + 6], [20, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <span key={i} style={{
              opacity, transform: `translateY(${translateY}px)`,
              fontSize: 64, fontWeight: 800, color: "white", fontFamily: resolveFont(font),
            }}>
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
