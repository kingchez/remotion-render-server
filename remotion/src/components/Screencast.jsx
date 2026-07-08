import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame } from "remotion";
import { DeviceFrame } from "./DeviceFrame";
import { AnimatedCursor } from "./AnimatedCursor";

// Recorded screen video + an animated highlight box that draws attention
// to a specific area (e.g. the n8n node being explained), plus a caption.
// Optional: wrap in a browser DeviceFrame, and/or overlay an AnimatedCursor
// path for the "tutorial with a big cursor clicking things" look.
export const Screencast = ({
  videoUrl,
  caption,
  highlightBox, // { xPct, yPct, widthPct, heightPct } - all 0-100, optional
  highlightFromFrame = 0,
  highlightToFrame,
  deviceFrame = false, // wrap in a fake browser window
  deviceFrameUrl, // shown in the fake browser's URL bar
  cursorPoints, // [{x, y, hold, click}] - overlay an animated cursor path
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const highlightEnd = highlightToFrame ?? durationInFrames;
  const highlightOpacity = interpolate(
    frame,
    [highlightFromFrame, highlightFromFrame + 10, highlightEnd - 10, highlightEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const content = (
    <>
      <OffthreadVideo src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      {highlightBox ? (
        <div
          style={{
            position: "absolute",
            left: `${highlightBox.xPct}%`,
            top: `${highlightBox.yPct}%`,
            width: `${highlightBox.widthPct}%`,
            height: `${highlightBox.heightPct}%`,
            border: "5px solid #FFD400",
            borderRadius: 12,
            boxShadow: "0 0 0 4000px rgba(0,0,0,0.35)",
            opacity: highlightOpacity,
          }}
        />
      ) : null}
      {cursorPoints ? <AnimatedCursor points={cursorPoints} /> : null}
    </>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {deviceFrame ? (
        <DeviceFrame url={deviceFrameUrl}>{content}</DeviceFrame>
      ) : (
        content
      )}
      {caption ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 100 }}>
          <div style={{
            background: "rgba(0,0,0,0.75)", color: "white", padding: "16px 32px",
            borderRadius: 12, fontSize: 40, fontWeight: 600, fontFamily: "Arial, sans-serif",
            maxWidth: "85%", textAlign: "center",
          }}>
            {caption}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
