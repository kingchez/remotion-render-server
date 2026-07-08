import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const QuoteCard = ({ quote, author, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 20], [0.85, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const bgShift = interpolate(frame, [0, durationInFrames], [0, 40]);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${135 + bgShift}deg, #1B1F3B, #2E86FF)`,
      justifyContent: "center", alignItems: "center", padding: 100,
    }}>
      <div style={{ transform: `scale(${scale})`, opacity, textAlign: "center" }}>
        <div style={{
          fontSize: 58, fontWeight: 700, color: "white", fontFamily: "Georgia, serif", lineHeight: 1.3,
        }}>
          "{quote}"
        </div>
        {author ? (
          <div style={{ marginTop: 24, fontSize: 30, color: "#DDE6FF", fontFamily: "Arial, sans-serif" }}>
            — {author}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
