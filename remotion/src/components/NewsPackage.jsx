import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { resolveFont } from "../fonts";

// Broadcast news package layer: a channel bug (top right), one lower-third
// strap that stays on screen from the first story to the recap and changes
// its words with a vertical flip, a category tab that flashes when the
// category changes, a mono source line, and a corner tag
// (ILLUSTRATION / SCHEMATIC). It is a video-wide layer, not a scene: it is
// timed in absolute frames, so it keeps running across scene cuts and wipes.
//
// newsPackage = {
//   brand: { name, accent, gold, ink, paper, alarm, olive },     (all optional)
//   bug:   { fromFrame },                  channel bug appears at this frame
//   straps: [{ fromFrame, toFrame, tab, headline, sub, source, tag, alarm }]
// }
// A strap stays until the next strap's fromFrame; the last one leaves at its
// own toFrame (slides down). `alarm: true` colours the tab with the reserved
// breaking colour (only for BREAKING / LIVE).
//
// Geometry follows the package spec for a 1920x1080 frame and is scaled to
// the real width; vertical frames use a 1080-wide design with the strap
// placed in the lower fifth, above the phone interface.

const FLIP = 10; // frames for a words flip (0.33 s at 30 fps)
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const DEFAULT_BRAND = {
  name: "NEWS",
  accent: "#F2CF1D",
  gold: "#D4B064",
  ink: "#121417",
  paper: "#F4F1E8",
  alarm: "#FE6B3D",
  olive: "#6E5A1E",
};

function layout(width, height) {
  const horizontal = width >= height;
  if (horizontal) {
    const s = width / 1920;
    return {
      s,
      horizontal,
      tab: { x: 96, y: 856, h: 48 },
      strap: { x: 96, y: 904, w: 1250, h: 104, end: 120 },
      source: { right: 1836, y: 962, maxW: 360 },
      bug: { cx: 1739, cy: 86, w: 170, h: 59 },
      tag: { x: 96, y: 56, h: 52 },
      head: 54,
      sub: 27,
    };
  }
  const s = width / 1080;
  const base = Math.round(height / s * 0.79);
  return {
    s,
    horizontal,
    tab: { x: 48, y: base - 52, h: 44 },
    strap: { x: 48, y: base, w: 984, h: 176, end: 0 },
    source: { right: 1032, y: base - 40, maxW: 520 },
    bug: { cx: 940, cy: 150, w: 170, h: 59 },
    tag: { x: 48, y: 110, h: 46 },
    head: 58,
    sub: 31,
  };
}

function activeStraps(straps, frame) {
  if (!Array.isArray(straps) || straps.length === 0) return null;
  const sorted = [...straps].sort((a, b) => a.fromFrame - b.fromFrame);
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) if (frame >= sorted[i].fromFrame) idx = i;
  if (idx < 0) return null;
  const cur = sorted[idx];
  const next = sorted[idx + 1];
  const endFrame = cur.toFrame ?? (next ? next.fromFrame : Infinity);
  const isLast = !next;
  return { cur, prev: idx > 0 ? sorted[idx - 1] : null, first: sorted[0], isLast, endFrame, last: sorted[sorted.length - 1] };
}

export const NewsPackage = ({ brand: brandIn, bug, straps }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const brand = { ...DEFAULT_BRAND, ...(brandIn || {}) };
  const L = layout(width, height);
  const px = (n) => n * L.s;

  const head = resolveFont("condensed");
  const mono = resolveFont("mono");

  // ---- strap state
  const st = activeStraps(straps, frame);
  let strapEl = null;
  if (st) {
    const { cur, prev, isLast, endFrame, first } = st;
    const enter = interpolate(frame, [first.fromFrame, first.fromFrame + 14], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    });
    const exit = isLast && Number.isFinite(endFrame)
      ? interpolate(frame, [endFrame, endFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })
      : 0;
    const gone = isLast && Number.isFinite(endFrame) && frame >= endFrame + 10;
    const slide = Math.max(enter, exit); // 0 = in place, 1 = fully below the frame
    const dt = frame - cur.fromFrame;
    const flipping = prev && dt >= 0 && dt < FLIP;
    const p = flipping ? ease(dt / FLIP) : 1;

    const tabChanged = prev && prev.tab !== cur.tab;
    const flash = tabChanged && dt >= 0 && dt < 6 ? 1 - dt / 6 : 0;
    const tabBg = (cur.alarm ? brand.alarm : brand.accent);
    const tabTextColor = brand.ink;

    const words = (s, yOffset, key) => (
      <div key={key} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", transform: `translateY(${yOffset}px)` }}>
        <div style={{
          fontFamily: head, fontWeight: 800, fontSize: px(L.head), lineHeight: 1.02, color: brand.ink, textTransform: "uppercase", overflow: "hidden",
          ...(L.horizontal
            ? { whiteSpace: "nowrap", textOverflow: "ellipsis" }
            : { whiteSpace: "normal", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }),
        }}>
          {s.headline}
        </div>
        {s.sub ? (
          <div style={{ fontFamily: head, fontWeight: 600, fontSize: px(L.sub), lineHeight: 1.1, color: brand.olive, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: px(4) }}>
            {s.sub}
          </div>
        ) : null}
      </div>
    );

    const H = px(L.strap.h);
    const stackCurrent = words(cur, flipping ? (1 - p) * H : 0, "cur");
    const stackPrev = flipping ? words(prev, -p * H, "prev") : null;

    if (!gone) {
      strapEl = (
        <div style={{ position: "absolute", left: 0, top: 0, width, height, transform: `translateY(${slide * px(200)}px)`, pointerEvents: "none" }}>
          {/* tab */}
          <div style={{
            position: "absolute", left: px(L.tab.x), top: px(L.tab.y), height: px(L.tab.h), padding: `0 ${px(26)}px`,
            display: "flex", alignItems: "center",
            background: flash > 0 ? mix(tabBg, "#FFFFFF", flash) : tabBg,
            color: tabTextColor, fontFamily: head, fontWeight: 800, fontSize: px(28), letterSpacing: px(2), textTransform: "uppercase",
          }}>
            {cur.tab}
          </div>
          {/* paper strap */}
          <div style={{ position: "absolute", left: px(L.strap.x), top: px(L.strap.y), width: px(L.strap.w), height: H, background: brand.paper, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: px(28), right: px(24), top: 0, bottom: 0, overflow: "hidden" }}>
              {stackPrev}
              {stackCurrent}
            </div>
          </div>
          {/* ink end block with an accent slash */}
          {L.strap.end > 0 ? (
            <div style={{ position: "absolute", left: px(L.strap.x + L.strap.w), top: px(L.strap.y), width: px(L.strap.end), height: H, background: brand.ink }}>
              <div style={{ position: "absolute", left: px(18), top: 0, bottom: 0, width: px(10), background: brand.accent, transform: "skewX(-18deg)" }} />
              <div style={{ position: "absolute", left: px(36), top: 0, bottom: 0, width: px(4), background: brand.gold, transform: "skewX(-18deg)" }} />
            </div>
          ) : null}
          {/* source line */}
          {cur.source ? (
            <div style={{
              position: "absolute", right: width - px(L.source.right), top: px(L.source.y), maxWidth: px(L.source.maxW),
              textAlign: "right", fontFamily: mono, fontWeight: 500, fontSize: px(18), letterSpacing: px(1.5), textTransform: "uppercase",
              color: brand.gold, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {cur.source}
            </div>
          ) : null}
        </div>
      );
    }
  }

  // ---- corner tag (ILLUSTRATION / SCHEMATIC): flips in and out over 6 frames
  let tagEl = null;
  if (st && st.cur.tag) {
    const { cur, endFrame } = st;
    const tin = interpolate(frame, [cur.fromFrame, cur.fromFrame + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const tout = Number.isFinite(endFrame) ? interpolate(frame, [endFrame - 6, endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
    const k = Math.min(tin, tout);
    if (k > 0) {
      tagEl = (
        <div style={{
          position: "absolute", left: px(L.tag.x), top: px(L.tag.y), height: px(L.tag.h), padding: `0 ${px(20)}px`,
          display: "flex", alignItems: "center", background: brand.ink, color: brand.accent,
          fontFamily: mono, fontWeight: 500, fontSize: px(18), letterSpacing: px(2), textTransform: "uppercase",
          transform: `scaleY(${k})`, transformOrigin: "top", borderLeft: `${px(6)}px solid ${brand.accent}`,
        }}>
          {st.cur.tag}
        </div>
      );
    }
  }

  // ---- channel bug (the brand plate, scaled down)
  let bugEl = null;
  const bugFrom = bug && Number.isFinite(bug.fromFrame) ? bug.fromFrame : null;
  if (bugFrom !== null && frame >= bugFrom) {
    const t = interpolate(frame, [bugFrom, bugFrom + 10], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
    const w = px(L.bug.w);
    const h = px(L.bug.h);
    bugEl = (
      <div style={{
        position: "absolute", left: px(L.bug.cx) - w / 2, top: px(L.bug.cy) - h / 2, width: w, height: h,
        transform: `scale(${t})`, opacity: Math.min(1, t * 1.5),
      }}>
        <div style={{ position: "absolute", inset: 0, transform: "skewX(-14deg)", background: `linear-gradient(135deg, ${brand.accent}, ${shade(brand.accent, -0.12)})`, boxShadow: "0 4px 14px rgba(0,0,0,0.35)" }} />
        <div style={{ position: "absolute", left: w * 0.05, top: 0, bottom: 0, width: w * 0.03, transform: "skewX(-14deg)", background: brand.ink }} />
        <div style={{ position: "absolute", left: w * 0.095, top: 0, bottom: 0, width: w * 0.012, transform: "skewX(-14deg)", background: brand.gold }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: w * 0.08, fontFamily: head, fontWeight: 800, fontSize: h * 0.52, color: brand.ink, letterSpacing: h * 0.03, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {brand.name}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {tagEl}
      {bugEl}
      {strapEl}
    </div>
  );
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}
function shade(hex, amt) {
  return mix(hex, amt < 0 ? "#000000" : "#FFFFFF", Math.abs(amt));
}
