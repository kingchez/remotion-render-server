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
import { FilmLook } from "./components/FilmLook";
import { SceneGraph } from "./SceneGraph";
import { getCameraStyle } from "./camera";
import { getTransitionStyle } from "./transitions";

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

// Wraps a scene's content with an optional entrance/exit transition
// (crossfade, wipe, zoom) that overlaps with the neighboring scene.
// frontExtend/backExtend are how many frames this scene's Sequence was
// extended on each side to create the overlap window.
const TransitionWrapper = ({
  children, durationInFrames, frontExtend, backExtend, ownTransitionIn, ownTransitionDuration,
  nextTransitionIn, nextTransitionDuration,
}) => {
  const frame = useCurrentFrame(); // local frame within this scene's (possibly extended) Sequence

  let style = {};
  if (frontExtend > 0 && frame < frontExtend) {
    const progress = frame / ownTransitionDuration;
    style = getTransitionStyle(ownTransitionIn, progress);
  } else if (backExtend > 0 && frame >= durationInFrames - backExtend) {
    const framesIntoExit = frame - (durationInFrames - backExtend);
    const progress = 1 - framesIntoExit / nextTransitionDuration;
    style = getTransitionStyle(nextTransitionIn, progress);
  }

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const SceneVideo = ({ scenes, audioUrl, look }) => {
  // Precompute each scene's actual (possibly overlap-extended) timing.
  // Normal case (no transitions specified anywhere): behaves exactly like
  // the old simple sequential loop - fully backward compatible.
  let cumulativeStart = 0;
  const timedScenes = scenes.map((scene, i) => {
    const ownTransitionIn = scene.transitionIn && scene.transitionIn !== "none" ? scene.transitionIn : null;
    const ownTransitionDuration = scene.transitionDuration ?? 15;
    const nextScene = scenes[i + 1];
    const nextTransitionIn = nextScene?.transitionIn && nextScene.transitionIn !== "none" ? nextScene.transitionIn : null;
    const nextTransitionDuration = nextScene?.transitionDuration ?? 15;

    const frontExtend = i > 0 && ownTransitionIn ? ownTransitionDuration : 0;
    const backExtend = nextTransitionIn ? nextTransitionDuration : 0;

    const from = cumulativeStart - frontExtend;
    const durationInFrames = scene.durationInFrames + frontExtend + backExtend;
    cumulativeStart += scene.durationInFrames;

    return { scene, from, durationInFrames, frontExtend, backExtend, ownTransitionIn, ownTransitionDuration, nextTransitionIn, nextTransitionDuration };
  });

  return (
    <AbsoluteFill>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      {timedScenes.map((t, i) => {
        const { scene, from, durationInFrames, frontExtend, backExtend, ownTransitionIn, ownTransitionDuration, nextTransitionIn, nextTransitionDuration } = t;

        // Per-scene audio: if this scene resolved an audioUrl (e.g. from a
        // scene-level audioDriveFileId), play it during just this scene -
        // this is what makes per-segment voiceovers actually sync to their
        // matching scene, instead of only supporting one whole-video track.
        // Scene-level field works for both classic and scene-graph (objects[])
        // formats; scene.props?.audioUrl is kept as a fallback for older
        // classic-format scenes that set it there directly.
        const sceneAudioUrl = scene.audioUrl ?? scene.props?.audioUrl;

        // Any scene can carry optional word-level captions (from WhisperX
        // timing) that overlay on top of whatever style is being used -
        // captions are independent of which visual style a scene uses.
        // Same scene-level-first, props-fallback pattern as audio above.
        const captionWords = scene.captionWords ?? scene.props?.captionWords;
        const captionStyle = scene.captionStyle ?? scene.props?.captionStyle;

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
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            {sceneAudioUrl ? <Audio src={sceneAudioUrl} /> : null}
            <TransitionWrapper
              durationInFrames={durationInFrames}
              frontExtend={frontExtend}
              backExtend={backExtend}
              ownTransitionIn={ownTransitionIn}
              ownTransitionDuration={ownTransitionDuration}
              nextTransitionIn={nextTransitionIn}
              nextTransitionDuration={nextTransitionDuration}
            >
              <CameraWrapper movement={scene.camera} durationInFrames={scene.durationInFrames}>
                {content}
              </CameraWrapper>
              {captionWords ? <AnimatedCaptions words={captionWords} {...captionStyle} /> : null}
            </TransitionWrapper>
          </Sequence>
        );
      })}
      {look?.grain || look?.vignette ? (
        <FilmLook grain={look?.grain} vignette={look?.vignette} grainOpacity={look?.grainOpacity} />
      ) : null}
    </AbsoluteFill>
  );
};
