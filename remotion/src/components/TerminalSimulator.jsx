import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const TYPE_COLORS = { command: "#fafafa", log: "#a1a1aa", success: "#22c55e", error: "#ef4444" };

function Light({ color }) {
  return <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, opacity: 0.85 }} />;
}

// lines: [{ text, type: "command"|"log"|"success"|"error", delay }]
// All timing computed from a single top-level frame - no nested Sequences,
// which is more robust across Remotion's rendering pipeline.
export const TerminalSimulator = ({ lines, prompt = "$", title = "~/project", fontSize = 18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lineHeight = Math.round(fontSize * 1.6);
  const visibleLines = 8;
  const charsPerFrame = 1;

  const timing = [];
  let cursor = 10;
  for (let i = 0; i < lines.length; i++) {
    const delay = lines[i].delay ?? 8;
    const start = cursor + delay;
    const end = start + Math.ceil(lines[i].text.length / charsPerFrame);
    timing.push({ start, end });
    cursor = end;
  }

  const linesStarted = timing.filter((t) => frame >= t.start).length;
  const scrollOffset = Math.max(0, linesStarted - visibleLines) * lineHeight;
  const cursorBlinkOn = Math.floor((frame / fps) * 2) % 2 === 0;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0F1115" }}>
      <div style={{
        width: 900, height: 480, background: "#0a0a0a", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column",
        fontFamily: "'Courier New', monospace",
      }}>
        <div style={{ height: 40, background: "#1a1a1a", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, flexShrink: 0 }}>
          <Light color="#ff5f57" /><Light color="#febc2e" /><Light color="#28c840" />
          <div style={{ flex: 1, textAlign: "center", color: "#71717a", fontSize: 13 }}>{title}</div>
        </div>
        <div style={{ flex: 1, padding: 20, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 20, right: 20, top: 20, transform: `translateY(${-scrollOffset}px)` }}>
            {lines.map((line, i) => {
              const { start, end } = timing[i];
              if (frame < start) return null;
              const totalChars = line.text.length;
              const revealed = Math.min(totalChars, Math.max(0, Math.floor((frame - start) * charsPerFrame)));
              const visibleText = line.text.substring(0, revealed);
              const isTyping = frame < end;
              return (
                <div key={i} style={{
                  height: lineHeight, fontSize, color: TYPE_COLORS[line.type] || "#fafafa",
                  display: "flex", alignItems: "center", whiteSpace: "pre",
                }}>
                  {line.type === "command" ? <span style={{ color: "#22c55e", marginRight: 8 }}>{prompt}</span> : null}
                  <span>{visibleText}</span>
                  {isTyping && cursorBlinkOn ? (
                    <span style={{ display: "inline-block", width: fontSize * 0.55, height: fontSize, background: TYPE_COLORS[line.type] || "#fafafa", marginLeft: 2 }} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
