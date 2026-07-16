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
import { BarChartRace } from "./components/BarChartRace";
import { LineChart } from "./components/LineChart";
import { DonutChart } from "./components/DonutChart";
import { AreaChart } from "./components/AreaChart";
import { PieChart } from "./components/PieChart";
import { CircularProgress } from "./components/CircularProgress";
import { ProgressSteps } from "./components/ProgressSteps";
import { TerminalSimulator } from "./components/TerminalSimulator";
import { DataFlowPipes } from "./components/DataFlowPipes";
import { AnimatedCaptions } from "./components/AnimatedCaptions";

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
  BarChartRace,
  LineChart,
  DonutChart,
  AreaChart,
  PieChart,
  CircularProgress,
  ProgressSteps,
  TerminalSimulator,
  DataFlowPipes,
  AnimatedCaptions,
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

        // Per-scene audio: if this scene's own props resolved an audioUrl
        // (e.g. from an audioDriveFileId), play it during just this scene -
        // this is what makes per-segment voiceovers actually sync to their
        // matching scene, instead of only supporting one whole-video track.
        const sceneAudioUrl = scene.props?.audioUrl;

        // Any scene can carry optional word-level captions (from WhisperX
        // timing) that overlay on top of whatever style is being used -
        // captions are independent of which visual style a scene uses.
        const captionWords = scene.props?.captionWords;

        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            {sceneAudioUrl ? <Audio src={sceneAudioUrl} /> : null}
            <StyleComponent {...scene.props} durationInFrames={scene.durationInFrames} />
            {captionWords ? <AnimatedCaptions words={captionWords} {...scene.props?.captionStyle} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
