import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from "remotion";
import { useCanvasPage } from "../canvasPage";

// Plays an agent-written HTML canvas animation (see canvasPage.jsx) as a
// normal scene. This is what lets the style-atlas styles render through the
// same pipeline as every other component.
//
// props:
//   html         the full self-contained page (required)
//   soundUrl     optional WAV of the page's own sound effects (the server
//                fills this in automatically from window.scoreSound)
//   soundVolume  0..1, default 1
//   startSec     start this many seconds into the animation
//   loop         true = repeat the animation if the scene is longer
//   fit          "contain" (default; blurred bars when the frame is not 16:9)
//                or "cover" (fills the frame, crops the edges)
//   transparent  true = no black backing and no blurred bars, so whatever the
//                page leaves transparent (clearRect, no background fill) shows
//                the layer underneath: an overlay of graphics, captions or
//                package parts on top of a Video object in a scene graph
//   opacity      0..1 for the whole layer, default 1
//   (window.ASSETS[name] = data URI of each file passed in `assets`; set up by the server)

function pickCanvas(doc) {
  let best = null;
  let area = 0;
  for (const c of doc.querySelectorAll("canvas")) {
    const a = c.width * c.height;
    if (a > area) {
      best = c;
      area = a;
    }
  }
  return best;
}

function drawFit(ctx, src, W, H, fit, transparent) {
  const sw = src.width;
  const sh = src.height;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const cover = Math.max(W / sw, H / sh);
  const contain = Math.min(W / sw, H / sh);
  const s = fit === "cover" ? cover : contain;
  if (!transparent && fit !== "cover" && Math.abs(cover - contain) > 0.001) {
    // Bars (vertical video): a blurred, dimmed copy of the same frame fills them.
    const bw = sw * cover * 1.08;
    const bh = sh * cover * 1.08;
    ctx.save();
    ctx.filter = "blur(36px) brightness(0.55)";
    ctx.drawImage(src, (W - bw) / 2, (H - bh) / 2, bw, bh);
    ctx.restore();
  }
  const dw = sw * s;
  const dh = sh * s;
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

export const CanvasAnimation = ({
  html,
  soundUrl,
  soundVolume = 1,
  startSec = 0,
  loop = false,
  fit = "contain",
  transparent = false,
  opacity = 1,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const outRef = useRef(null);
  const srcRef = useRef(null);

  const { element, win } = useCanvasPage({
    html,
    label: "CanvasAnimation",
    isReady: (w) => typeof w.seek === "function" && Number(w.DURATION) > 0,
  });

  // Synchronous on purpose: seek + copy happen before Remotion takes the
  // screenshot, so no extra delayRender is needed per frame.
  useLayoutEffect(() => {
    if (!win || !outRef.current) return;
    const total = Number(win.DURATION) || durationInFrames / fps;
    let t = frame / fps + startSec;
    t = loop ? t % total : Math.min(t, Math.max(0, total - 1 / fps));
    win.seek(Math.max(0, t));
    if (!srcRef.current || !srcRef.current.isConnected) srcRef.current = pickCanvas(win.document);
    if (!srcRef.current) throw new Error("CanvasAnimation: no <canvas> found in the page");
    drawFit(outRef.current.getContext("2d"), srcRef.current, width, height, fit, transparent);
  }, [win, frame, fps, width, height, startSec, loop, fit, transparent]);

  return (
    <AbsoluteFill style={{ backgroundColor: transparent ? "transparent" : "#000", opacity }}>
      {element}
      <canvas ref={outRef} width={width} height={height} style={{ width: "100%", height: "100%" }} />
      {soundUrl ? (
        <Audio src={soundUrl} volume={soundVolume} startFrom={Math.round(startSec * fps)} />
      ) : null}
    </AbsoluteFill>
  );
};
