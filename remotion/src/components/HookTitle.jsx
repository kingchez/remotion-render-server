import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// HOOK TITLE — the premium cold-open text treatment for the first ~0.5-1.5s
// of a short. Ported/adapted from a reference motion-graphics skill's own
// "survive the scroll-decision window" design goal. Distinct from KineticText
// (the workhorse mid-video text) - this is a composed, hierarchical lockup:
// a small kicker line, a huge headline (with one word able to carry emphasis
// color), and an optional sub-line - built to read INSTANTLY, not to be
// savored, since a scrolling viewer decides whether to stop in well under a
// second. Real spring entrance, no lingering fade-up.
export const HookTitle = ({
  kicker,
  headline, // string - split into words; wrap the emphasis word in **like this**
  subline,
  accentColor = "#4ADE80",
  font = "display",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const typeBase = Math.min(width, height);

  const words = headline.split(" ").map((w) => {
    const emph = w.startsWith("**") && w.endsWith("**");
    return { text: emph ? w.slice(2, -2) : w, emph };
  });

  const kickerK = interpolate(frame, [0, Math.round(fps * 0.22)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineSpring = spring({ frame: frame - Math.round(fps * 0.05), fps, durationInFrames: Math.round(fps * 0.4), config: { damping: 13, stiffness: 220, mass: 0.6 } });
  const sublineK = interpolate(frame, [Math.round(fps * 0.32), Math.round(fps * 0.55)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const kickerSize = Math.round(typeBase * 0.032);
  const headlineSize = Math.round(typeBase * 0.1);
  const sublineSize = Math.round(typeBase * 0.036);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F121A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: width * 0.08, textAlign: "center" }}>
      {kicker ? (
        <div style={{
          fontFamily: resolveFont(font === "display" ? "ui" : font), fontWeight: 700, fontSize: kickerSize, color: accentColor,
          textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: typeBase * 0.02,
          opacity: kickerK, transform: `translateY(${(1 - kickerK) * 12}px)`,
        }}>
          {kicker}
        </div>
      ) : null}
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${headlineSize * 0.08}px ${headlineSize * 0.22}px`,
        opacity: Math.min(1, headlineSpring * 1.4), transform: `scale(${interpolate(headlineSpring, [0, 1], [0.75, 1])})`,
      }}>
        {words.map((w, i) => (
          <span key={i} style={{
            fontFamily: resolveFont(font), fontWeight: 800, fontSize: headlineSize, lineHeight: 0.98,
            letterSpacing: "-0.02em", color: w.emph ? accentColor : "#FFFFFF",
            textShadow: w.emph ? `0 0 ${headlineSize * 0.25}px ${accentColor}66` : "0 4px 16px rgba(0,0,0,0.5)",
          }}>
            {w.text}
          </span>
        ))}
      </div>
      {subline ? (
        <div style={{
          fontFamily: resolveFont(font === "display" ? "ui" : font), fontWeight: 500, fontSize: sublineSize, color: "#C7CDD9",
          marginTop: typeBase * 0.026, maxWidth: width * 0.8, opacity: sublineK, transform: `translateY(${(1 - sublineK) * 10}px)`,
        }}>
          {subline}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
