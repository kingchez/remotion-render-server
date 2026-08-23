import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveFont } from "../fonts";

// CONCEPT BUILD — the flagship "more than a diagram" explainer. Closes the
// other half of the network/structure gap: NetworkDiagram handles fixed
// topology (nodes+edges, general relationships); ConceptBuild handles
// free-form STRUCTURE/COMPOSITION ("these three things live inside the
// system") and METAPHOR ("the context window is a desk that fills up") -
// concepts that don't fit a rigid sequence or topology template. You place
// labeled elements at arbitrary positions and draw connectors between
// them, and every piece reveals on the exact word that introduces it -
// the viewer's mental model assembles WITH the narration, not before it.
//
// Quality bar this was built to hit (ported from a reference motion-
// graphics skill's own internal standard, de-branded to neutral defaults):
//  - elements build in with a launch-from-center spring pop, never a flat
//    fade or hard cut
//  - connectors draw progressively (stroke wipe) with an optional one-time
//    "spawn pulse" - a bright packet that fires the instant the edge
//    finishes drawing, so a new connection reads as a burst of energy
//  - one accent color reserved for the single emphasized element/connector
//    per frame - never more than one thing "shouting" at once
//  - a continuous idle float on every settled element so the canvas never
//    reads as a frozen slide
//
// elements: [{ id, label, sublabel?, glyph?, x, y, w?, h?, variant?
//               ("box"|"chip"|"tile"|"frame"|"note"), emphasis?, appearAtSec? }]
// connectors: [{ from, to, label?, flowing?, emphasis?, appearAtSec? }]
export const ConceptBuild = ({
  title,
  elements = [],
  connectors = [],
  startAtSec = 0,
  accentColor = "#4ADE80",
  bgColor = "#0F121A",
  cardTopColor = "#FFFFFF",
  cardBottomColor = "#E6EBF4",
  textColor = "#161B26",
  font = "ui",
  durationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  if (!elements.length) return null;

  const typeBase = Math.min(width, height);
  const padX = width * 0.08;
  const padTop = height * (title ? 0.2 : 0.12);
  const padBottom = height * 0.12;
  const canvasW = width - padX * 2;
  const canvasH = height - padTop - padBottom;

  const centerOf = (id) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return null;
    return { cx: el.x * canvasW, cy: el.y * canvasH };
  };

  const rank = (v) => (v === "frame" ? 0 : 1);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Focusing vignette - the build reads as the subject, not a flat slide */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 65% at 50% 52%, rgba(15,18,26,0) 0%, rgba(8,10,15,0.5) 100%)" }} />

      {title ? (
        <div style={{
          position: "absolute", top: height * 0.07, left: padX,
          fontFamily: resolveFont(font), fontWeight: 700, fontSize: Math.round(typeBase * 0.044),
          letterSpacing: "0.04em", textTransform: "uppercase", color: "#FFFFFF",
          display: "flex", alignItems: "center", gap: typeBase * 0.018,
        }}>
          <span style={{ width: typeBase * 0.05, height: 3, background: accentColor, display: "inline-block", borderRadius: 2 }} />
          {title}
        </div>
      ) : null}

      <div style={{ position: "absolute", left: padX, top: padTop, width: canvasW, height: canvasH }}>
        <svg width={canvasW} height={canvasH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {connectors.map((c, i) => (
            <ConceptConnector key={i} c={c} a={centerOf(c.from)} b={centerOf(c.to)} startAtSec={startAtSec}
              typeBase={typeBase} accentColor={accentColor} font={font} frame={frame} fps={fps} />
          ))}
        </svg>

        {[...elements].sort((e1, e2) => rank(e1.variant) - rank(e2.variant)).map((el) => (
          <ConceptElement key={el.id} el={el} canvasW={canvasW} canvasH={canvasH} startAtSec={startAtSec}
            typeBase={typeBase} accentColor={accentColor} cardTopColor={cardTopColor}
            cardBottomColor={cardBottomColor} textColor={textColor} bgColor={bgColor} font={font}
            frame={frame} fps={fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const ConceptConnector = ({ c, a, b, startAtSec, typeBase, accentColor, font, frame, fps }) => {
  if (!a || !b) return null;
  const localAppear = Math.max(0, (c.appearAtSec ?? startAtSec) - startAtSec);
  const appearFrame = Math.round(localAppear * fps);
  const k = interpolate(frame, [appearFrame, appearFrame + Math.round(0.45 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (k <= 0.001) return null;

  const stroke = c.emphasis ? accentColor : "#7E8AA8";
  const sw = Math.max(2, Math.round(typeBase * 0.006));
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const pad = Math.min(len * 0.18, typeBase * 0.06);
  const ax = a.cx + (dx / len) * pad;
  const ay = a.cy + (dy / len) * pad;
  const bxFull = b.cx - (dx / len) * pad;
  const byFull = b.cy - (dy / len) * pad;
  const bx = ax + (bxFull - ax) * k;
  const by = ay + (byFull - ay) * k;
  const ang = Math.atan2(byFull - ay, bxFull - ax);
  const ah = typeBase * 0.016;

  const pulseStart = appearFrame + Math.round(0.42 * fps);
  const pulseDurF = Math.round(0.5 * fps);
  const pulseRaw = (frame - pulseStart) / pulseDurF;
  const showPulse = pulseRaw >= 0 && pulseRaw <= 1;
  const pulseEase = interpolate(pulseRaw, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ppx = ax + (bxFull - ax) * pulseEase;
  const ppy = ay + (byFull - ay) * pulseEase;
  const pulseFade = Math.sin(Math.max(0, Math.min(1, pulseRaw)) * Math.PI);

  const tFlow = (frame % Math.round(fps * 1.1)) / Math.round(fps * 1.1);
  const px = ax + (bxFull - ax) * tFlow;
  const py = ay + (byFull - ay) * tFlow;

  return (
    <g opacity={Math.min(1, k * 1.2)}>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      {k > 0.85 ? (
        <polygon points={`0,${-ah * 0.6} ${ah},0 0,${ah * 0.6}`} fill={stroke}
          transform={`translate(${bxFull},${byFull}) rotate(${(ang * 180) / Math.PI})`} />
      ) : null}
      {showPulse ? (
        <g opacity={pulseFade}>
          <circle cx={ppx} cy={ppy} r={sw * 4.6} fill={accentColor} opacity={0.18} />
          <circle cx={ppx} cy={ppy} r={sw * 2.1} fill={accentColor} />
        </g>
      ) : null}
      {c.flowing && k > 0.9 ? <circle cx={px} cy={py} r={sw * 1.7} fill={accentColor} opacity={0.85} /> : null}
      {c.label && k > 0.6 ? (
        <foreignObject x={(ax + bxFull) / 2 - typeBase * 0.09} y={(ay + byFull) / 2 - typeBase * 0.028} width={typeBase * 0.18} height={typeBase * 0.056} style={{ overflow: "visible" }}>
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center", height: "100%",
            opacity: interpolate(k, [0.6, 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}>
            <span style={{
              fontFamily: resolveFont(font), fontWeight: 600, fontSize: Math.round(typeBase * 0.022),
              color: "#161B26", background: accentColor, padding: `${typeBase * 0.006}px ${typeBase * 0.014}px`,
              borderRadius: 999, whiteSpace: "nowrap",
            }}>
              {c.label}
            </span>
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
};

const ConceptElement = ({ el, canvasW, canvasH, startAtSec, typeBase, accentColor, cardTopColor, cardBottomColor, textColor, bgColor, font, frame, fps }) => {
  const localAppear = Math.max(0, (el.appearAtSec ?? startAtSec) - startAtSec);
  const appearFrame = Math.round(localAppear * fps);
  const k = interpolate(frame, [appearFrame, appearFrame + Math.round(0.5 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const variant = el.variant ?? "box";
  const emph = !!el.emphasis;
  const cx = el.x * canvasW;
  const cy = el.y * canvasH;

  // Springy overshooting pop that launches the node outward from the
  // canvas center toward its slot - so the hub visibly "emits" each piece.
  const s = spring({ frame: frame - appearFrame, fps, durationInFrames: Math.round(0.62 * fps), config: { damping: 11, stiffness: 160, mass: 0.7 } });
  const enterScale = interpolate(s, [0, 1], [0.5, 1]);
  const blur = (1 - k) * 11;
  const launch = 0.4 * (1 - s);
  const flyX = (canvasW / 2 - cx) * launch;
  const flyY = (canvasH / 2 - cy) * launch;

  const phase = el.x * 6.3 + el.y * 11.7;
  const tSec = frame / fps;
  const floatY = Math.sin(tSec * 1.5 + phase) * typeBase * 0.006 * s;
  const floatX = Math.cos(tSec * 1.1 + phase) * typeBase * 0.003 * s;
  const hubPulse = emph ? (0.5 + 0.5 * Math.sin(tSec * 2.2)) * s : 0;

  const labelSize = Math.round(typeBase * 0.03);
  const subSize = Math.round(typeBase * 0.021);
  const glyphSize = Math.round(typeBase * 0.05);
  const defaultW = variant === "chip" ? 0.2 : variant === "tile" ? 0.16 : variant === "note" ? 0.22 : 0.26;
  const wFrac = el.w ?? defaultW;
  const boxW = wFrac * canvasW;

  if (variant === "frame") {
    const fw = (el.w ?? 0.5) * canvasW;
    const fh = (el.h ?? 0.5) * canvasH;
    return (
      <div style={{
        position: "absolute", left: cx - fw / 2, top: cy - fh / 2, width: fw, height: fh,
        border: `2px dashed ${emph ? accentColor : "#4A5573"}`, borderRadius: typeBase * 0.024,
        opacity: k * 0.9, transform: `scale(${enterScale})`, transformOrigin: "center", boxSizing: "border-box",
      }}>
        {el.label ? (
          <div style={{
            position: "absolute", top: -typeBase * 0.024, left: typeBase * 0.02, background: bgColor,
            padding: `0 ${typeBase * 0.012}px`, fontFamily: resolveFont(font), fontWeight: 700,
            fontSize: subSize, letterSpacing: "0.04em", textTransform: "uppercase",
            color: emph ? accentColor : "#8A95B3",
          }}>
            {el.label}
          </div>
        ) : null}
      </div>
    );
  }

  const isTile = variant === "tile";
  const isChip = variant === "chip";
  const isNote = variant === "note";
  const bg = isNote ? "transparent" : emph
    ? `radial-gradient(circle at 38% 30%, ${accentColor}dd 0%, ${accentColor} 60%, ${accentColor}aa 100%)`
    : `linear-gradient(180deg, ${cardTopColor} 0%, ${cardBottomColor} 100%)`;
  const fg = emph ? "#0F121A" : textColor;
  const shadow = emph
    ? `0 0 ${typeBase * (0.05 + 0.035 * hubPulse)}px ${accentColor}73, 0 0 ${typeBase * (0.1 + 0.05 * hubPulse)}px ${accentColor}2e, 0 ${typeBase * 0.014}px ${typeBase * 0.034}px rgba(0,0,0,0.55)`
    : `0 ${typeBase * 0.016}px ${typeBase * 0.04}px rgba(0,0,0,0.5), inset 0 ${typeBase * 0.004}px 0 rgba(255,255,255,0.8)`;

  return (
    <div style={{
      position: "absolute", left: cx - boxW / 2, top: cy, width: boxW,
      transform: `translate(${flyX + floatX}px, calc(-50% + ${flyY + floatY}px)) scale(${enterScale})`,
      transformOrigin: "center", opacity: k, filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
    }}>
      <div style={{
        background: bg, border: isNote ? "none" : emph ? `2px solid ${accentColor}` : "1px solid rgba(255,255,255,0.85)",
        borderRadius: isChip ? 999 : typeBase * 0.018, boxShadow: isNote ? "none" : shadow,
        padding: isChip ? `${typeBase * 0.012}px ${typeBase * 0.022}px` : isNote ? 0 : typeBase * 0.02,
        boxSizing: "border-box", display: "flex", flexDirection: isTile ? "column" : "row",
        alignItems: "center", justifyContent: isTile ? "center" : "flex-start", gap: typeBase * 0.012,
        textAlign: isTile || isNote ? "center" : "left",
      }}>
        {el.glyph ? <div style={{ fontSize: isTile ? glyphSize : labelSize, lineHeight: 1 }}>{el.glyph}</div> : null}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: resolveFont(font), fontWeight: 700, fontSize: isNote ? subSize : labelSize,
            lineHeight: 1.12, letterSpacing: "-0.01em", color: isNote ? "#9AA5C2" : fg,
            fontStyle: isNote ? "italic" : "normal", overflowWrap: "break-word",
          }}>
            {el.label}
          </div>
          {el.sublabel ? (
            <div style={{
              fontFamily: resolveFont(font), fontWeight: 500, fontSize: subSize, lineHeight: 1.25,
              marginTop: typeBase * 0.004, color: emph ? "rgba(15,18,26,0.7)" : "rgba(22,27,38,0.62)",
              overflowWrap: "break-word",
            }}>
              {el.sublabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
