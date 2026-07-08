import { Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const TYPE_COLORS = { command: "#fafafa", log: "#a1a1aa", success: "#22c55e", error: "#ef4444" };

function autoPause(line) {
  if (line.pause !== undefined) return line.pause;
  if (line.text.trimEnd().endsWith("...")) return 18;
  return 0;
}

function Light({ color }) {
  return <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, opacity: 0.85 }} />;
}

function TerminalLineRow({ line, prompt, fontSize, lineHeight }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalChars = line.text.length;
  const revealed = Math.floor(
    interpolate(frame, [0, totalChars], [0, totalChars], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const visible = line.text.substring(0, revealed);
  const typingDone = revealed >= totalChars;
  const cursorVisible = Math.floor((frame / fps) * 2) % 2 === 0;

  return (
    <div style={{ height: lineHeight, fontSize, color: TYPE_COLORS[line.type], display: "flex", alignItems: "center", whiteSpace: "pre" }}>
      {line.type === "command" && <span style={{ color: "#22c55e", marginRight: 8 }}>{prompt}</span>}
      <span>{visible}</span>
      {!typingDone && cursorVisible && (
        <span style={{ display: "inline-block", width: fontSize * 0.55, height: fontSize, background: TYPE_COLORS[line.type], marginLeft: 2 }} />
      )}
    </div>
  );
}

// lines: [{ text, type: "command"|"log"|"success"|"error", delay, pause }]
export const TerminalSimulator = ({ lines, prompt = "$", title = "~/project", fontSize = 18 }) => {
  const lineHeight = Math.round(fontSize * 1.6);
  const visibleLines = 8;

  const starts = [];
  let acc = 10;
  for (let i = 0; i < lines.length; i++) {
    const delay = lines[i].delay ?? 8;
    acc += delay;
    starts.push(acc);
    const typingFrames = lines[i].text.length;
    acc += typingFrames + autoPause(lines[i]);
  }

  const frame = useCurrentFrame();
  let translateY = 0;
  for (let i = visibleLines; i < lines.length; i++) {
    if (frame >= starts[i]) translateY -= lineHeight;
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0F1115" }}>
      <div style={{
        width: 900, height: 480, background: "#0a0a0a", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column",
        fontFamily: "'Courier New', monospace",
      }}>
        <div style={{ height: 40, background: "#1a1a1a", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
          <Light color="#ff5f57" /><Light color="#febc2e" /><Light color="#28c840" />
          <div style={{ flex: 1, textAlign: "center", color: "#71717a", fontSize: 13 }}>{title}</div>
        </div>
        <div style={{ flex: 1, padding: 20, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 20, right: 20, top: 20, transform: `translateY(${translateY}px)` }}>
            {lines.map((line, index) => (
              <Sequence key={index} from={starts[index]} layout="none">
                <TerminalLineRow line={line} prompt={prompt} fontSize={fontSize} lineHeight={lineHeight} />
              </Sequence>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
