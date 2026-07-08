import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

// Simplified "drawing reveal": the illustration wipes in left-to-right like
// it's being drawn. A true stroke-by-stroke SVG version can replace this
// later once we have vectorized illustrations to work with.
export const WhiteboardSketch = ({ imageUrl, text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const revealPct = interpolate(frame, [0, durationInFrames * 0.6], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <div style={{
        position: "absolute", inset: 0,
        clipPath: `inset(0 ${100 - revealPct}% 0 0)`,
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      {text ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 100 }}>
          <div style={{
            fontSize: 44, fontWeight: 700, color: "#222", fontFamily: "Arial, sans-serif",
            textAlign: "center", maxWidth: "85%",
          }}>
            {text}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
