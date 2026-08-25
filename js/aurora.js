/* aurora.js — the animated desktop background, in two flavours.
 *
 *   aero  → drifting bokeh bubbles: sunlight through water.
 *   retro → Mystify. Bouncing polygons trailing colour-cycled ghosts, the
 *           way the 1995 screensaver did it.
 *
 * Both pause when the tab is hidden, and both fall back to a single static
 * frame under prefers-reduced-motion.
 */

import { on } from "./bus.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

const BUBBLE_TINTS = [
  [255, 255, 255], [199, 237, 251], [168, 232, 92], [147, 219, 244],
];

export function initAurora() {
  const canvas = document.querySelector("#aurora-canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let running = true;
  let mode = paletteMode();

  let bubbles = [];
  let shapes = [];

  function paletteMode() {
    return document.documentElement.dataset.palette === "aero" ? "aero" : "retro";
  }

  /* ------------------------------------------------------------- aero ---- */

  function makeBubble(anywhere) {
    const r = 8 + Math.random() * 54;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + r,
      r,
      speed: 0.09 + Math.random() * 0.34,
      drift: (Math.random() - 0.5) * 0.28,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.004 + Math.random() * 0.01,
      alpha: 0.07 + Math.random() * 0.2,
      tint: BUBBLE_TINTS[(Math.random() * BUBBLE_TINTS.length) | 0],
    };
  }

  function drawBubbles() {
    ctx.clearRect(0, 0, width, height);
    for (const b of bubbles) {
      b.phase += b.wobble;
      b.y -= b.speed;
      b.x += b.drift + Math.sin(b.phase) * 0.35;
      if (b.y + b.r < -20) Object.assign(b, makeBubble(false));

      const [r, g, bl] = b.tint;
      const grad = ctx.createRadialGradient(
        b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r
      );
      grad.addColorStop(0, `rgba(255,255,255,${b.alpha * 1.5})`);
      grad.addColorStop(0.55, `rgba(${r},${g},${bl},${b.alpha * 0.6})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------ retro ---- */

  const TRAIL = 14;      // ghost polygons kept behind the leading edge
  const NODES = 4;       // corners per shape

  function makeShape(hue) {
    return {
      hue,
      nodes: Array.from({ length: NODES }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.9),
        vy: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.9),
      })),
      history: [],
    };
  }

  function drawMystify() {
    ctx.clearRect(0, 0, width, height);

    for (const shape of shapes) {
      // Each corner bounces independently — that's what makes the polygon
      // tumble instead of merely translating.
      for (const n of shape.nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x <= 0 || n.x >= width) { n.vx *= -1; n.x = Math.max(0, Math.min(width, n.x)); }
        if (n.y <= 0 || n.y >= height) { n.vy *= -1; n.y = Math.max(0, Math.min(height, n.y)); }
      }

      shape.history.push(shape.nodes.map((n) => ({ x: n.x, y: n.y })));
      if (shape.history.length > TRAIL) shape.history.shift();

      shape.hue = (shape.hue + 0.35) % 360;

      shape.history.forEach((frame, index) => {
        const depth = (index + 1) / shape.history.length;   // 0 = oldest
        ctx.beginPath();
        ctx.moveTo(frame[0].x, frame[0].y);
        for (let i = 1; i < frame.length; i += 1) ctx.lineTo(frame[i].x, frame[i].y);
        ctx.closePath();
        ctx.strokeStyle = `hsla(${(shape.hue - index * 6 + 360) % 360}, 62%, 62%, ${0.1 + depth * 0.32})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }

  /* ------------------------------------------------------------ shared --- */

  function spawn() {
    if (mode === "aero") {
      const count = Math.round(Math.min(46, Math.max(14, (width * height) / 26000)));
      bubbles = Array.from({ length: count }, () => makeBubble(true));
      shapes = [];
    } else {
      shapes = [makeShape(200), makeShape(330)];
      bubbles = [];
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawn();
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    if (mode === "aero") drawBubbles(); else drawMystify();
    if (running) requestAnimationFrame(draw);
  }

  on("palette", () => {
    mode = paletteMode();
    spawn();
    if (REDUCED.matches) draw();       // repaint the one static frame
  });

  if (REDUCED.matches) {
    running = false;
    draw();
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      requestAnimationFrame(draw);
    }
  });

  requestAnimationFrame(draw);
}
