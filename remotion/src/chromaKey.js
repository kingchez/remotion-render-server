import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function colorDistance(r, g, b, kr, kg, kb) {
  const dr = (r - kr) / 255;
  const dg = (g - kg) / 255;
  const db = (b - kb) / 255;
  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
}

// True color-based chroma key: works when the source image was actually
// shot/rendered on a solid, uniform key color (e.g. a green-screen PNG or
// render). This is NOT AI subject-cutout for an arbitrary photo with a
// non-uniform background - that needs real segmentation (a remove.bg/
// removal.ai-style API call), which is deliberately out of scope here so
// this stays free and fully local.
//
// The pixel pass runs once per distinct (imageUrl, chromaKey) pair, keyed
// off the effect's dependency array - not once per rendered frame - so it
// stays cheap even across a long scene. Remotion renders a contiguous
// frame range per browser worker without remounting components, so this
// only re-runs once per worker (== concurrency setting), not once per
// frame. delayRender/continueRender make the headless renderer wait for
// this pass before it captures any frame that needs the result.
export function useChromaKeyedImage(imageUrl, chromaKey) {
  const [resultUrl, setResultUrl] = useState(chromaKey ? null : imageUrl);

  useEffect(() => {
    if (!imageUrl) {
      setResultUrl(null);
      return;
    }
    if (!chromaKey) {
      setResultUrl(imageUrl);
      return;
    }

    const handle = delayRender(`chroma-key ${imageUrl}`);
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const [kr, kg, kb] = hexToRgb(chromaKey.color ?? "#00FF00");
        const similarity = chromaKey.similarity ?? 0.4; // below this distance -> fully transparent
        const smoothness = chromaKey.smoothness ?? 0.08; // soft edge band above that

        for (let i = 0; i < data.data.length; i += 4) {
          const dist = colorDistance(data.data[i], data.data[i + 1], data.data[i + 2], kr, kg, kb);
          if (dist < similarity) {
            data.data[i + 3] = 0;
          } else if (dist < similarity + smoothness) {
            const t = (dist - similarity) / smoothness;
            data.data[i + 3] = Math.round(data.data[i + 3] * t);
          }
        }

        ctx.putImageData(data, 0, 0);
        setResultUrl(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error(`Chroma key failed for ${imageUrl}, falling back to original image:`, err.message);
        setResultUrl(imageUrl);
      } finally {
        continueRender(handle);
      }
    };
    img.onerror = () => {
      console.error(`Chroma key: image failed to load: ${imageUrl}`);
      setResultUrl(imageUrl);
      continueRender(handle);
    };
    img.src = imageUrl;
  }, [imageUrl, chromaKey?.color, chromaKey?.similarity, chromaKey?.smoothness]);

  return resultUrl;
}
