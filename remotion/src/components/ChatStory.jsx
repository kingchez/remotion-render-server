import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";

export const ChatStory = ({ messages, durationInFrames, font = "ui"}) => {
  const frame = useCurrentFrame();
  const perMsg = durationInFrames / messages.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#E5E5E5", padding: 80, justifyContent: "flex-end" }}>
      {messages.map((msg, i) => {
        const start = i * perMsg;
        const opacity = interpolate(frame, [start, start + 10], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const y = interpolate(frame, [start, start + 10], [20, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const isMe = msg.sender === "me";
        return (
          <div key={i} style={{
            opacity, transform: `translateY(${y}px)`,
            alignSelf: isMe ? "flex-end" : "flex-start",
            background: isMe ? "#2E86FF" : "white",
            color: isMe ? "white" : "#111",
            padding: "16px 24px", borderRadius: 20, fontSize: 32,
            fontFamily: resolveFont(font), maxWidth: "70%", marginBottom: 16,
          }}>
            {msg.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
