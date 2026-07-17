import { AbsoluteFill, Audio, Sequence } from "remotion";
import { useCurrentFrame } from "remotion";
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
import { Icon } from "./components/Icon";
import { TiltShiftOverlay } from "./components/TiltShiftOverlay";
import { SceneGraph } from "./SceneGraph";
import { getCameraStyle } from "./camera";

// The full style library. Every scene picks one of these by name, OR a
// scene can instead use `objects: [...]` (the scene-graph format) with
// `{ type: "preset", name: "QuoteCard", props: {...} }` referencing any
// of these same components as a preset (Phase 5).
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
  Icon,
};

export const calculateTotalFrames = (scenes) => {
  return scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
};

// Wraps a scene's content with an optional camera movement (Phase 3).
// Movement name comes from scene.camera - only feasible movements from
// the Camera Movements research are implemented (see camera.js).
const CameraWrapper = ({ movement, durationInFrames, children }) => {
  const frame = useCurrentFrame();
  if (!movement) return children;

  const { wrapperStyle, overlay } = getCameraStyle(movement, frame, durationInFrames);

  return (
    <>
      <AbsoluteFill style={wrapperStyle}>{children}</AbsoluteFill>
      {overlay === "tilt-shift" ? <TiltShiftOverlay /> : null}
    </>
  );
};

export const SceneVideo = ({ scenes, audioUrl }) => {
  let startFrame = 0;

  return (
    <AbsoluteFill>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      {scenes.map((scene, i) => {
        const from = startFrame;
        startFrame += scene.durationInFrames;

        // Per-scene audio: if this scene's own props resolved an audioUrl
        // (e.g. from an audioDriveFileId), play it during just this scene -
        // this is what makes per-segment voiceovers actually sync to their
        // matching scene, instead of only supporting one whole-video track.
        const sceneAudioUrl = scene.props?.audioUrl;

        // Any scene can carry optional word-level captions (from WhisperX
        // timing) that overlay on top of whatever style is being used -
        // captions are independent of which visual style a scene uses.
        const captionWords = scene.props?.captionWords;

        // Two ways to define a scene's content:
        // 1. Classic: scene.component + scene.props (all 25 existing styles)
        // 2. Scene-graph: scene.objects (Phase 4) - a list of primitives
        //    and/or presets composed together freely.
        let content;
        if (Array.isArray(scene.objects)) {
          content = (
            <SceneGraph
              objects={scene.objects}
              durationInFrames={scene.durationInFrames}
              presetLibrary={STYLE_LIBRARY}
            />
          );
        } else {
          const StyleComponent = STYLE_LIBRARY[scene.component];
          if (!StyleComponent) {
            throw new Error(
              `Unknown component "${scene.component}" in scene ${i}. Available: ${Object.keys(STYLE_LIBRARY).join(", ")}`
            );
          }
          content = <StyleComponent {...scene.props} durationInFrames={scene.durationInFrames} />;
        }

        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames}>
            {sceneAudioUrl ? <Audio src={sceneAudioUrl} /> : null}
            <CameraWrapper movement={scene.camera} durationInFrames={scene.durationInFrames}>
              {content}
            </CameraWrapper>
            {captionWords ? <AnimatedCaptions words={captionWords} {...scene.props?.captionStyle} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
