import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { resolveFont } from "../fonts";
import { normalizeAssetUrl } from "../assetUrl";
import { Img } from "remotion";

// Closes a real gap: a grid/mosaic of several thumbnails staggering in one
// cell at a time (the "you can now Recreate" montage-grid reveal). Same
// staggered-reveal idea as RankedList, but for images arranged in a grid
// instead of a vertical list.
//
// `items`: [{ imageUrl (or imageDriveFileId, resolved server-side the same
// as any other *DriveFileId prop - see src/index.js), label? }]
// Each cell fades/pops in with a per-cell offset based on `staggerFrames`.
export const MediaGrid = ({
  title,
  items = [],
  columns = 3,
  gap = 16,
  staggerFrames = 4, // frames between each cell's entrance start
  cellDuration = 15, // how long each cell's own pop/fade takes
  borderRadius = 12,
  durationInFrames,
  font = "ui",
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0F1115", padding: 60, alignItems: "center" }}>
      {title ? (
        <div
          style={{
            fontSize: 46, fontWeight: 800, color: "white", fontFamily: resolveFont(font),
            marginBottom: 30, textAlign: "center",
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
          width: "100%",
        }}
      >
        {items.map((item, i) => {
          const start = i * staggerFrames;
          const progress = interpolate(frame, [start, start + cellDuration], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const scale = 0.85 + progress * 0.15;
          const src = normalizeAssetUrl(item.imageUrl);
          return (
            <div
              key={i}
              style={{
                opacity: progress,
                transform: `scale(${scale})`,
                borderRadius,
                overflow: "hidden",
                position: "relative",
                aspectRatio: "9 / 16",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {src ? (
                <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
              {item.label ? (
                <div
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "8px 10px", background: "rgba(0,0,0,0.55)",
                    color: "white", fontSize: 16, fontFamily: resolveFont(font),
                  }}
                >
                  {item.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
