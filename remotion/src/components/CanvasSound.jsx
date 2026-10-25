import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender } from "remotion";
import { useCanvasPage } from "../canvasPage";
import { encodeWav, toBase64 } from "../wav";

// Not a scene: a one-frame helper composition the server renders (as a still)
// before the real render. It loads the animation page, runs the SOUND kit's
// offline renderer on the page's window.scoreSound, and POSTs the result back
// to the server as a base64 WAV. Remotion's own audio pipeline then plays that
// WAV inside the CanvasAnimation scene.
export const CanvasSound = ({ html, uploadUrl }) => {
  const [handle] = useState(() =>
    delayRender("CanvasSound: rendering sound", { timeoutInMilliseconds: 240000 })
  );
  const { element, win } = useCanvasPage({
    html,
    label: "CanvasSound",
    timeoutMs: 30000,
    isReady: (w) =>
      typeof w.scoreSound === "function" &&
      w.SOUND &&
      typeof w.SOUND.renderOffline === "function" &&
      Number(w.DURATION) > 0,
  });

  useEffect(() => {
    if (!win) return;
    (async () => {
      try {
        const inter = await win.SOUND.renderOffline(win.scoreSound, Number(win.DURATION), 48000, {
          voiceover: false,
        });
        const b64 = toBase64(encodeWav(inter, 48000, 2));
        // no-cors: the server is on another origin and we do not need to read the reply.
        await fetch(uploadUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: b64,
        });
        continueRender(handle);
      } catch (e) {
        cancelRender(e);
      }
    })();
  }, [win]);

  return <AbsoluteFill>{element}</AbsoluteFill>;
};
