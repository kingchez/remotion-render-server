import { Icon } from "./components/Icon";
import { Text } from "./components/Text";
import { Image } from "./components/Image";
import { Shape } from "./components/Shape";
import { AnimatedCursor } from "./components/AnimatedCursor";

// The primitive library - generic building blocks, usable inside any
// scene-graph object list. Small and deliberately so; new visual ideas
// should first be tried as a combination of these before a new primitive
// is added.
const PRIMITIVES = {
  icon: Icon,
  text: Text,
  image: Image,
  shape: Shape,
  cursor: AnimatedCursor,
};

// A scene built from `objects: [{type, ...props}]` instead of a single
// fixed component. Each object is positioned/animated independently.
// `presetLibrary` is passed in from SceneVideo so a "preset" object type
// can reuse any of the existing 25 named styles (Phase 5).
export const SceneGraph = ({ objects, durationInFrames, presetLibrary }) => {
  return (
    <>
      {objects.map((obj, i) => {
        if (obj.type === "preset") {
          const PresetComponent = presetLibrary[obj.name];
          if (!PresetComponent) {
            throw new Error(`Unknown preset "${obj.name}" in scene-graph object ${i}`);
          }
          return <PresetComponent key={i} {...obj.props} durationInFrames={durationInFrames} />;
        }

        const Primitive = PRIMITIVES[obj.type];
        if (!Primitive) {
          throw new Error(
            `Unknown primitive type "${obj.type}" in scene-graph object ${i}. Available: ${Object.keys(PRIMITIVES).join(", ")}, or "preset"`
          );
        }
        return <Primitive key={i} {...obj} durationInFrames={durationInFrames} />;
      })}
    </>
  );
};
