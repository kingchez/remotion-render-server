import { AbsoluteFill, Audio, Sequence } from "remotion";
import { KenBurnsImage } from "./components/KenBurnsImage";
import { Screencast } from "./components/Screencast";
import { MotionGraphic } from "./components/MotionGraphic";
import { KineticText } from "./components/KineticText";
import { NewsLowerThird } from "./components/NewsLowerThird";
import { Timeline } from "./components/Timeline";
import { QuoteCard } from "./components/QuoteCard";
import { DataViz } from "./components/DataViz";
import { WhiteboardSketch } from "./components/WhiteboardSketch";
import { RankedList } from "./components/RankedList";
import { ChatStory } from "./components/ChatStory";
import { MapZoom } from "./components/MapZoom";
import { SplitCompare } from "./components/SplitCompare";
import { ProductShowcase } from "./components/ProductShowcase";

// The full style library. Every scene picks one of these by name.
const STYLE_LIBRARY = {
  KenBurnsImage,
  Screencast,
  MotionGraphic,
  KineticText,
  NewsLowerThird,
  Timeline,
  QuoteCard,
  DataViz,
  WhiteboardSketch,
  RankedList,
  ChatStory,
  MapZoom,
  SplitCompare,
  ProductShowcase,
};

export const calculateTotalFrames = (scenes) => {
  return scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
};

export const SceneVideo = ({ scenes, audioUrl }) => {
  let startFrame = 0;

  return (
    <AbsoluteFill>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      {scenes.map((scene, i) => {
        const from = startFrame;
        startFrame += scene.durationInFrames;

        const StyleComponent = STYLE_LIBRARY[scene.component];
        if (!StyleComponent) {
          throw new Error(
            `Unknown component "${scene.component}" in scene ${i}. Available: ${Object.keys(STYLE_LIBRARY).join(", ")}`
          );
        }

        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            <StyleComponent {...scene.props} durationInFrames={scene.durationInFrames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
