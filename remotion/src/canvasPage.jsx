import React, { useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

// Agent-written animations (the style-atlas prompts) are self-contained HTML
// pages: a canvas, a `window.seek(t)` that draws the frame at time t, a
// `window.DURATION`, and a `window.scoreSound(k)` for sound effects. This
// hook loads such a page into a hidden iframe so Remotion can drive it.
//
// The preamble runs before the page's own scripts and switches off the
// page's own play loop (requestAnimationFrame), so the only thing that ever
// moves time is Remotion calling seek(t) - every frame is then exactly the
// frame the page would draw at that t.
const PREAMBLE =
  "<script>window.requestAnimationFrame=function(){return 0};window.cancelAnimationFrame=function(){};</script>";

export function injectPreamble(html) {
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + PREAMBLE)
    : PREAMBLE + html;
}

export function useCanvasPage({ html, isReady, label, timeoutMs = 60000 }) {
  const iframeRef = useRef(null);
  const [win, setWin] = useState(null);
  const [handle] = useState(() =>
    delayRender(`${label}: loading page`, { timeoutInMilliseconds: timeoutMs + 30000 })
  );

  const onLoad = async () => {
    try {
      const w = iframeRef.current.contentWindow;
      const started = Date.now();
      while (!isReady(w)) {
        if (Date.now() - started > timeoutMs) {
          throw new Error(`${label}: the page did not become ready within ${timeoutMs / 1000}s`);
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      if (w.document.fonts && w.document.fonts.ready) await w.document.fonts.ready;
      setWin(w);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  };

  useEffect(() => {
    if (!html) cancelRender(new Error(`${label} needs an "html" prop with the animation page`));
  }, [html]);

  const element = html ? (
    <iframe
      ref={iframeRef}
      title={label}
      srcDoc={injectPreamble(html)}
      onLoad={onLoad}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
        border: 0,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  ) : null;

  return { element, win };
}
