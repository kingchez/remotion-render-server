import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

function PinIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8, verticalAlign: "middle" }}>
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8z" fill="#FF5252" />
      <circle cx="12" cy="10" r="3" fill="white" />
    </svg>
  );
}

export const MapZoom = ({ imageUrl, label, fromScale = 1, toScale = 1.3, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [fromScale, toScale], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {label ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-start", padding: 60 }}>
          <div style={{
            background: "rgba(0,0,0,0.75)", color: "white", padding: "14px 26px",
            borderRadius: 12, fontSize: 36, fontWeight: 700, fontFamily: "Arial, sans-serif",
            display: "flex", alignItems: "center",
          }}>
            <PinIcon /> {label}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
