# rywnswn.home

A personal site built as a fake desktop OS. Three draggable, resizable windows,
a working taskbar, a guestbook, and a frutiger-aero paint job.

No build step, no dependencies, no framework. Open `index.html` and it runs.

---

## Run it

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening the file directly with `file://` mostly works, but ES modules need a
real server in some browsers, so use the command above.

## Deploy it

It's static, so anything works. GitHub Pages:

1. Push to `main`
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `root`

No configuration, no Actions workflow.

---

## What to edit

Everything you'd actually want to change is in `index.html`, marked with
`EDIT ME` comments.

| I want to change...      | Go to                                                    |
| ------------------------ | -------------------------------------------------------- |
| Name, bio, tags          | the `ABOUT_ME.TXT` panel                                  |
| Links                    | the `BOOKMARKS` panel — there's a commented template to copy |
| Projects                 | the `<ul class="file-list">` — one `<li>` per project      |
| Now listening / reading  | the `NOW.PANEL` `<dl>`                                     |
| The rotating status jokes| `.profile-status-options` — add as many `<span>`s as you like |
| Colors                   | `css/tokens.css` — the whole palette is ~20 variables at the top |

The "N ITEMS" and "N FILES" counters read the DOM, so they update themselves
when you add things.

---

## How it's put together

```
index.html          all the content, no logic
css/
  tokens.css        palette, type, and the two surface recipes everything reuses
  desktop.css       the OS: background, window chrome, taskbar, cursor
  panels.css        what lives inside the windows
js/
  bus.js            tiny event bus + localStorage that never throws
  sound.js          interface sounds, synthesised with WebAudio
  cursor.js         the canvas cursor
  aurora.js         the drifting bokeh background
  windows.js        the window manager
  dialogs.js        <dialog> wiring + copy to clipboard
  status.js         clock, counters, rotating status, file selection
  guestbook.js      the guestbook
  main.js           boot
```

**Modules never import each other.** They talk over a `window` event bus
(`bus.js`), so any one of them can be deleted without touching the others.
`main.js` starts each in a `try/catch` — if one throws, the rest still come up.

A few decisions worth knowing about:

- **The sounds are synthesised**, not files. `sound.js` builds each one from
  oscillators at call time, so the whole sound design costs zero bytes of
  assets. Add `data-sound="tap"` to any element and it just works — one
  delegated listener handles the entire page. Sound is **off by default**.
- **The cursor is a canvas**, not `cursor: url()`. That's the only way to make
  it lag behind the pointer and swell over targets. It turns itself off on
  touch devices and for anyone with reduced motion on.
- **Window positions persist** to localStorage, but a saved position that no
  longer fits on screen is ignored — otherwise moving to a smaller monitor
  would strand a window off the edge with no way to get it back.
- **The guestbook is per-browser.** Entries are in *your* localStorage; nobody
  else sees them. The status line says so rather than pretending there's a
  server. To make it real, replace the two `store` calls in `guestbook.js` —
  the render path already treats every entry as untrusted text.
- **Below 860px the whole metaphor stands down.** Windows become a normal
  stacked scrolling page and the window manager doesn't bind any handlers.

### Accessibility

Decorative canvases, the film sheen and the scrolling ticker track are all
`aria-hidden`. The ticker's readable text lives once on the container's
`aria-label`, so screen readers get the sentence instead of the duplicated
marquee. Modals are native `<dialog>`, which brings focus trapping and
Escape-to-close for free. Every animation is disabled under
`prefers-reduced-motion`.

---

## Credit where it's due

The structure here — desktop metaphor, address strips, the ticker, the
event-bus-between-islands architecture — is a deliberate homage to
[tapeq.dev](https://tapeq.dev). The visual design, the code, and every bad joke
are original.
