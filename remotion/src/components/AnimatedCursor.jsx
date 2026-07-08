import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// points: [{ x, y, hold, click }] - a path the cursor travels, pausing at each
// point for `hold` frames, with a click ripple effect when `click: true`.
// This overlays on top of Screencast (or any style) to simulate a large,
// deliberately-animated cursor - the "explainer tutorial" look, decoupled
// from whatever the real mouse did during screen recording.
const DEFAULT_POINTS = [
  { x: 200, y: 150, hold: 20 },
  { x: 800, y: 360, hold: 25, click: true },
  { x: 1050, y: 560, hold: 20 },
];

export const AnimatedCursor = ({ points = DEFAULT_POINTS, color = "#ffffff", size = 32 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const travelPerLeg = 24;
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const start = cursor;
    const end = start + travelPerLeg;
    const holdEnd = end + (to.hold ?? 15);
    segments.push({ start, end, holdEnd, from, to });
    cursor = holdEnd;
  }

  let x = points[0].x;
  let y = points[0].y;
  let activeClickFrame = null;
  let clickTarget = null;

  if (segments.length === 0) {
    x = points[0].x;
    y = points[0].y;
  } else if (frame < segments[0].start + (points[0].hold ?? 0)) {
    x = points[0].x;
    y = points[0].y;
  } else {
    for (const seg of segments) {
      if (frame >= seg.start && frame < seg.holdEnd) {
        if (frame < seg.end) {
          x = interpolate(frame, [seg.start, seg.end], [seg.from.x, seg.to.x], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          y = interpolate(frame, [seg.start, seg.end], [seg.from.y, seg.to.y], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
        } else {
          x = seg.to.x;
          y = seg.to.y;
          if (seg.to.click) {
            activeClickFrame = frame - seg.end;
            clickTarget = seg.to;
          }
        }
        break;
      }
      if (frame >= seg.holdEnd) {
        x = seg.to.x;
        y = seg.to.y;
      }
    }
  }

  let clickScale = 1;
  let rippleRadius = 0;
  let rippleOpacity = 0;
  if (activeClickFrame !== null && clickTarget) {
    const dip = spring({
      fps, frame: activeClickFrame,
      config: { damping: 10, stiffness: 200, mass: 0.6 },
      durationInFrames: 14,
    });
    clickScale = 1 - dip * 0.18;
    rippleRadius = interpolate(activeClickFrame, [0, 24], [4, 60], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    rippleOpacity = interpolate(activeClickFrame, [0, 24], [0.6, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {rippleOpacity > 0 && (
        <svg style={{ position: "absolute", left: x - 80, top: y - 80, width: 160, height: 160 }}>
          <circle cx={80} cy={80} r={rippleRadius} fill="none" stroke={color} strokeWidth={2} opacity={rippleOpacity} />
        </svg>
      )}
      <div style={{
        position: "absolute", left: x, top: y, width: size, height: size,
        transform: `scale(${clickScale})`, transformOrigin: "top left", zIndex: 999999,
      }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3L5 19L9.5 14.5L12.5 21L15 20L12 13.5L18.5 13.5L5 3Z"
            fill={color} stroke="#000000" strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};
