/* aurora.js — the drifting bokeh background.
 *
 * Frutiger Aero is basically "sunlight through water", so: soft bubbles
 * rising with a slow horizontal wobble, in aqua and lime. Pauses itself
 * when the tab is hidden so it isn't burning battery in a background tab.
 */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

const TINTS = [
  [255, 255, 255],
  [199, 237, 251],
  [168, 232, 92],
  [147, 219, 244],
];

export function initAurora() {
  const canvas = document.querySelector("#aurora-canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  let dpr = 1;
  let width = 0;
  let height = 0;
  let bubbles = [];
  let running = true;

  function spawn() {
    // Bubble count scales with area, so a phone doesn't render 60 of them.
    const count = Math.round(Math.min(46, Math.max(14, (width * height) / 26000)));
    bubbles = Array.from({ length: count }, () => make(true));
  }

  function make(anywhere) {
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
      tint: TINTS[(Math.random() * TINTS.length) | 0],
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    ctx.clearRect(0, 0, width, height);

    for (const b of bubbles) {
      b.phase += b.wobble;
      b.y -= b.speed;
      b.x += b.drift + Math.sin(b.phase) * 0.35;

      if (b.y + b.r < -20) Object.assign(b, make(false));

      const [r, g, bl] = b.tint;
      const grad = ctx.createRadialGradient(
        b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.1,
        b.x, b.y, b.r
      );
      grad.addColorStop(0, `rgba(255,255,255,${b.alpha * 1.5})`);
      grad.addColorStop(0.55, `rgba(${r},${g},${bl},${b.alpha * 0.6})`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (running) requestAnimationFrame(draw);
  }

  if (REDUCED.matches) {
    // Draw one static frame — the texture without the motion.
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
