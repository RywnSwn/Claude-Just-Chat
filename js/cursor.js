/* cursor.js — a cursor drawn on a canvas, in two flavours.
 *
 *   aero  → a glass ring that lags behind the pointer on a spring and swells
 *           over anything clickable.
 *   retro → the actual pixel arrow, drawn cell by cell from a bitmap, with a
 *           pointing hand over links. No easing: 90s cursors did not ease.
 *
 * Falls back to the native cursor on touch and under reduced motion.
 */

import { on } from "./bus.js";

const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)");
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

/* X = outline, . = fill, space = transparent. Hotspot noted per bitmap. */
const ARROW = [
  "X          ",
  "XX         ",
  "X.X        ",
  "X..X       ",
  "X...X      ",
  "X....X     ",
  "X.....X    ",
  "X......X   ",
  "X.......X  ",
  "X........X ",
  "X.....XXXXX",
  "X..X..X    ",
  "X.X X..X   ",
  "XX  X..X   ",
  "X    X..X  ",
  "     X..X  ",
  "      XX   ",
];

const HAND = [
  "   XX      ",
  "  X..X     ",
  "  X..X     ",
  "  X..X     ",
  "  X..XXX   ",
  "  X..X..XX ",
  "  X..X..X.X",
  "XXX..X..X.X",
  "X..X.....X ",
  "X........X ",
  "X........X ",
  " X.......X ",
  " X.......X ",
  "  X.....X  ",
  "  X.....X  ",
  "  X.....X  ",
];

export function initCursor() {
  const canvas = document.querySelector("[data-custom-cursor]");
  if (!canvas || !FINE_POINTER.matches || REDUCED.matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  document.documentElement.classList.add("has-custom-cursor");

  const pointer = { x: -100, y: -100 };
  const ring = { x: -100, y: -100 };
  let radius = 13;
  let targetRadius = 13;
  let visible = false;
  let overTarget = false;
  let pressed = false;
  let mode = paletteMode();

  function paletteMode() {
    return document.documentElement.dataset.palette === "aero" ? "aero" : "retro";
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    visible = true;
    overTarget = Boolean(event.target.closest?.(
      "a, button, input, [data-drag-handle], [data-resize-handle], [tabindex]"
    ));
    targetRadius = overTarget ? 22 : 13;
  });

  window.addEventListener("pointerdown", () => { pressed = true; targetRadius *= 0.7; });
  window.addEventListener("pointerup", () => { pressed = false; targetRadius = overTarget ? 22 : 13; });
  document.addEventListener("pointerleave", () => { visible = false; });

  on("palette", () => { mode = paletteMode(); });

  /* ------------------------------------------------------------ retro ---- */

  function drawBitmap(bitmap, originX, originY) {
    // Snap to whole CSS pixels — a pixel cursor on a half-pixel is a smudge.
    const x0 = Math.round(originX);
    const y0 = Math.round(originY);

    for (let row = 0; row < bitmap.length; row += 1) {
      for (let col = 0; col < bitmap[row].length; col += 1) {
        const cell = bitmap[row][col];
        if (cell === " ") continue;
        ctx.fillStyle = cell === "X" ? "#14100c" : (pressed ? "#cfc7ba" : "#fdfaf3");
        ctx.fillRect(x0 + col, y0 + row, 1, 1);
      }
    }
  }

  /* ------------------------------------------------------------- aero ---- */

  function drawRing() {
    ring.x += (pointer.x - ring.x) * 0.22;
    ring.y += (pointer.y - ring.y) * 0.22;
    radius += (targetRadius - radius) * 0.18;

    const grad = ctx.createLinearGradient(ring.x, ring.y - radius, ring.x, ring.y + radius);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(1, "rgba(79,191,230,0.75)");

    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(168,232,92,0.12)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.fill();
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (visible) {
      if (mode === "aero") {
        drawRing();
      } else if (overTarget) {
        drawBitmap(HAND, pointer.x - 4, pointer.y);   // hotspot: fingertip
      } else {
        drawBitmap(ARROW, pointer.x, pointer.y);      // hotspot: tip at 0,0
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
