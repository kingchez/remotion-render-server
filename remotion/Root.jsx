import { Composition } from "remotion";
import { SceneVideo, calculateTotalFrames } from "./SceneVideo";

const FPS = 30;

// Two supported frame sizes. "orientation" in the job request picks one.
const DIMENSIONS = {
  vertical: { width: 1080, height: 1920 }, // Shorts / TikTok / Reels
  horizontal: { width: 1920, height: 1080 }, // standard YouTube
};

// Fallback props used only when previewing in Remotion Studio.
// Real renders always pass their own scenes via inputProps.
const defaultProps = {
  orientation: "vertical",
  scenes: [
    {
      component: "KenBurnsImage",
      durationInFrames: 90,
      props: {
        imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
        text: "Sample scene one",
      },
    },
    {
      component: "QuoteCard",
      durationInFrames: 90,
      props: {
        quote: "Automation is the mechanism, not the aesthetic",
        author: "Sample scene two",
      },
    },
  ],
  audioUrl: null,
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="SceneVideo"
      component={SceneVideo}
      fps={FPS}
      width={DIMENSIONS.vertical.width}
      height={DIMENSIONS.vertical.height}
      durationInFrames={calculateTotalFrames(defaultProps.scenes)}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => {
        const dims = DIMENSIONS[props.orientation] || DIMENSIONS.vertical;
        return {
          durationInFrames: calculateTotalFrames(props.scenes),
          width: dims.width,
          height: dims.height,
        };
      }}
    />
  );
};
