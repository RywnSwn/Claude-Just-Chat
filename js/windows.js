/* windows.js — the window manager.
 *
 * Drag, resize from 8 edges, minimize/maximize/close, z-order on focus,
 * a taskbar that stays in sync, marquee selection on the desktop, and
 * positions that survive a reload.
 *
 * Below 860px none of this applies: the media query stacks the windows
 * into a normal scrolling page and this module stands down entirely.
 */

import { emit, store } from "./bus.js";

const DESKTOP = window.matchMedia("(min-width: 861px)");
const EDGE_PAD = 8;

let topZ = 20;

export function initWindows() {
  const desktop = document.querySelector("[data-desktop]");
  if (!desktop) return;

  const windows = new Map();

  document.querySelectorAll("[data-window]").forEach((el) => {
    const id = el.dataset.window;
    windows.set(id, {
      id,
      el,
      taskbarButton: document.querySelector(`[data-window-launch="${id}"]`),
      restore: null,       // rect stashed before maximizing
      maximized: false,
      open: true,
    });
  });

  /* ---------------------------------------------------------------- focus */

  function focus(win) {
    if (!win.open) return;
    topZ += 1;
    win.el.style.zIndex = String(topZ);
    windows.forEach((w) => w.el.classList.toggle("is-focused", w === win));
    emit("window-focus", { id: win.id });
  }

  windows.forEach((win) => {
    win.el.addEventListener("pointerdown", () => focus(win), true);
  });

  /* --------------------------------------------------------- open / close */

  function setOpen(win, open, { silent = false } = {}) {
    win.open = open;
    win.el.hidden = !open;
    win.taskbarButton?.classList.toggle("is-active", open);
    win.taskbarButton?.setAttribute("aria-pressed", String(open));

    if (open) {
      win.el.classList.remove("is-minimizing");
      win.el.classList.add("is-opening");
      setTimeout(() => win.el.classList.remove("is-opening"), 320);
      focus(win);
    }
    if (!silent) emit(open ? "window-open" : "window-close", { id: win.id });
    persist(win);
  }

  function minimize(win) {
    win.el.classList.add("is-minimizing");
    // Let the transition finish before the element leaves the layout.
    setTimeout(() => setOpen(win, false), 180);
  }

  /* ----------------------------------------------------------- maximize */

  function toggleMaximize(win) {
    if (!DESKTOP.matches) return;
    const button = win.el.querySelector('[data-window-action="maximize"]');

    if (win.maximized) {
      win.maximized = false;
      win.el.classList.remove("is-maximized");
      if (win.restore) Object.assign(win.el.style, win.restore);
      button?.setAttribute("aria-pressed", "false");
    } else {
      const { el } = win;
      win.restore = {
        left: el.style.left, top: el.style.top,
        width: el.style.width, height: el.style.height,
      };
      win.maximized = true;
      el.classList.add("is-maximized");
      button?.setAttribute("aria-pressed", "true");
    }
    persist(win);
    emit("window-maximize", { id: win.id, maximized: win.maximized });
  }

  /* ------------------------------------------------------ control buttons */

  document.querySelectorAll("[data-window-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const win = windows.get(button.closest("[data-window]")?.dataset.window);
      if (!win) return;
      const action = button.dataset.windowAction;
      if (action === "close") minimize(win);
      if (action === "minimize") minimize(win);
      if (action === "maximize") toggleMaximize(win);
    });
  });

  /* ------------------------------------------------------------- taskbar */

  windows.forEach((win) => {
    win.taskbarButton?.addEventListener("click", () => {
      if (!win.open) return setOpen(win, true);
      // Already open: clicking its own focused button minimizes it, the way
      // a real taskbar does. Otherwise just raise it.
      const isFocused = win.el.classList.contains("is-focused");
      if (isFocused) minimize(win); else focus(win);
    });
  });

  /* ---------------------------------------------------------------- drag */

  function currentRect(win) {
    const wrap = desktop.getBoundingClientRect();
    const box = win.el.getBoundingClientRect();
    return {
      left: box.left - wrap.left,
      top: box.top - wrap.top,
      width: box.width,
      height: box.height,
      wrapWidth: wrap.width,
      wrapHeight: wrap.height,
    };
  }

  function bindDrag(win) {
    const handle = win.el.querySelector("[data-drag-handle]");
    if (!handle) return;

    handle.addEventListener("pointerdown", (event) => {
      if (!DESKTOP.matches || win.maximized) return;
      if (event.button !== 0) return;
      if (event.target.closest("button")) return;   // title-bar controls

      const rect = currentRect(win);
      const offsetX = event.clientX - (desktop.getBoundingClientRect().left + rect.left);
      const offsetY = event.clientY - (desktop.getBoundingClientRect().top + rect.top);

      // Freeze the size so a % / min() width doesn't reflow mid-drag.
      win.el.style.width = `${rect.width}px`;
      focus(win);
      handle.setPointerCapture(event.pointerId);

      const move = (e) => {
        const wrap = desktop.getBoundingClientRect();
        const maxX = wrap.width - rect.width - EDGE_PAD;
        const maxY = wrap.height - rect.height - EDGE_PAD;
        const x = clamp(e.clientX - wrap.left - offsetX, EDGE_PAD, Math.max(EDGE_PAD, maxX));
        const y = clamp(e.clientY - wrap.top - offsetY, EDGE_PAD, Math.max(EDGE_PAD, maxY));
        win.el.style.left = `${x}px`;
        win.el.style.top = `${y}px`;
      };

      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        persist(win);
      };

      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });

    handle.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      toggleMaximize(win);
    });
  }

  /* -------------------------------------------------------------- resize */

  function bindResize(win) {
    if (!win.el.hasAttribute("data-resizable")) return;

    const minW = Number(win.el.dataset.resizeMinWidth) || 320;
    const minH = Number(win.el.dataset.resizeMinHeight) || 240;

    win.el.querySelectorAll("[data-resize-handle]").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        if (!DESKTOP.matches || win.maximized) return;
        if (event.button !== 0) return;
        event.stopPropagation();

        const dir = handle.dataset.resizeHandle;
        const start = currentRect(win);
        const startX = event.clientX;
        const startY = event.clientY;

        focus(win);
        handle.setPointerCapture(event.pointerId);

        const move = (e) => {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          let { left, top, width, height } = start;

          if (dir.includes("e")) width = start.width + dx;
          if (dir.includes("s")) height = start.height + dy;
          if (dir.includes("w")) { width = start.width - dx; left = start.left + dx; }
          if (dir.includes("n")) { height = start.height - dy; top = start.top + dy; }

          // Clamping width alone would let the window slide away from the
          // pointer when dragging a west/north edge past the minimum, so
          // pin the moving edge back too.
          if (width < minW) { if (dir.includes("w")) left = start.left + (start.width - minW); width = minW; }
          if (height < minH) { if (dir.includes("n")) top = start.top + (start.height - minH); height = minH; }

          win.el.style.left = `${Math.max(EDGE_PAD, left)}px`;
          win.el.style.top = `${Math.max(EDGE_PAD, top)}px`;
          win.el.style.width = `${width}px`;
          win.el.style.height = `${height}px`;
        };

        const up = () => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", up);
          handle.removeEventListener("pointercancel", up);
          persist(win);
        };

        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
        handle.addEventListener("pointercancel", up);
      });
    });
  }

  /* --------------------------------------------------------- persistence */

  function persist(win) {
    if (!DESKTOP.matches) return;
    const { el } = win;
    store.set(`win.${win.id}`, {
      left: el.style.left, top: el.style.top,
      width: el.style.width, height: el.style.height,
      open: win.open, maximized: win.maximized,
    });
  }

  function restore(win) {
    if (!DESKTOP.matches) return;
    const saved = store.get(`win.${win.id}`);
    if (!saved) return;

    // A window saved off-screen (smaller monitor since last visit) would be
    // unreachable, so only take positions that still fit.
    const wrap = desktop.getBoundingClientRect();
    const left = parseFloat(saved.left);
    const top = parseFloat(saved.top);
    const fits = !Number.isNaN(left) && !Number.isNaN(top)
      && left < wrap.width - 80 && top < wrap.height - 60;

    if (fits) {
      win.el.style.left = saved.left;
      win.el.style.top = saved.top;
      if (saved.width) win.el.style.width = saved.width;
      if (saved.height) win.el.style.height = saved.height;
    }
    if (saved.maximized) toggleMaximize(win);
    if (saved.open === false) setOpen(win, false, { silent: true });
  }

  /* ---------------------------------------------------- marquee selection
     Does nothing useful. A real desktop has one, so this one has one too. */

  const marquee = document.querySelector("[data-desktop-selection]");

  desktop.addEventListener("pointerdown", (event) => {
    if (!DESKTOP.matches || !marquee) return;
    if (event.button !== 0) return;
    if (event.target !== desktop) return;      // only the bare desktop

    const wrap = desktop.getBoundingClientRect();
    const originX = event.clientX - wrap.left;
    const originY = event.clientY - wrap.top;
    let moved = false;

    const move = (e) => {
      moved = true;
      const x = e.clientX - wrap.left;
      const y = e.clientY - wrap.top;
      marquee.hidden = false;
      marquee.style.left = `${Math.min(originX, x)}px`;
      marquee.style.top = `${Math.min(originY, y)}px`;
      marquee.style.width = `${Math.abs(x - originX)}px`;
      marquee.style.height = `${Math.abs(y - originY)}px`;
    };

    const up = () => {
      desktop.removeEventListener("pointermove", move);
      desktop.removeEventListener("pointerup", up);
      marquee.hidden = true;
      if (moved) emit("desktop-marquee", {});
    };

    desktop.addEventListener("pointermove", move);
    desktop.addEventListener("pointerup", up);
  });

  /* ------------------------------------------------------------------ go */

  windows.forEach((win) => {
    bindDrag(win);
    bindResize(win);
    restore(win);
  });

  // Focus the first still-open window so the z-order starts somewhere sane.
  const first = [...windows.values()].find((w) => w.open);
  if (first) focus(first);

  // Coming back from mobile layout: drop the inline geometry so CSS wins.
  DESKTOP.addEventListener("change", (e) => {
    if (!e.matches) {
      windows.forEach((win) => {
        win.el.style.cssText = "";
        win.el.classList.remove("is-maximized");
        win.maximized = false;
      });
    }
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
