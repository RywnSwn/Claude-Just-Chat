/* cursor.js — a cursor drawn on a canvas.
 *
 * Not `cursor: url()`. A canvas means the ring can lag behind the pointer
 * with spring physics and swell over interactive targets, neither of which
 * CSS can express. Falls back to the native cursor on touch, on reduced
 * motion, and if anything at all goes wrong.
 */

const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)");
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initCursor() {
  const canvas = document.querySelector("[data-custom-cursor]");
  if (!canvas || !FINE_POINTER.matches || REDUCED.matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  document.documentElement.classList.add("has-custom-cursor");

  let dpr = 1;
  const pointer = { x: -100, y: -100 };   // where the mouse actually is
  const ring = { x: -100, y: -100 };      // where the ring has caught up to
  let radius = 13;
  let targetRadius = 13;
  let visible = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    visible = true;

    // Swell over anything you can actually click.
    const overTarget = event.target.closest?.(
      "a, button, input, [data-drag-handle], [data-resize-handle], [tabindex]"
    );
    targetRadius = overTarget ? 22 : 13;
  });

  window.addEventListener("pointerdown", () => { targetRadius *= 0.7; });
  window.addEventListener("pointerup", () => { targetRadius = targetRadius < 16 ? 13 : 22; });
  document.addEventListener("pointerleave", () => { visible = false; });

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (visible) {
      // Critically-damped-ish follow. 0.22 is the sweet spot: any lower and
      // it feels broken, any higher and there's no point using a canvas.
      ring.x += (pointer.x - ring.x) * 0.22;
      ring.y += (pointer.y - ring.y) * 0.22;
      radius += (targetRadius - radius) * 0.18;

      // outer glass ring
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

      // hard dot pinned to the real pointer, so clicking still feels precise
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
