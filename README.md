# Envira website

Next.js (App Router) site, exported as static files. Ported 1:1 from the original single-file `index.html` (still in git history), with the same markup, CSS and three.js scene.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 with hot reload
```

Dev mode runs unminified React and three.js plus the Next dev overlay, so it is heavier than the real site. Judge performance with the production build below.

## Build a static site

```bash
npm run build      # writes plain HTML/JS/CSS to out/
npm run preview    # serves out/ at http://localhost:3100
```

`out/` can be hosted anywhere static: Vercel, Netlify, Cloudflare Pages, GitHub Pages. For GitHub Pages at `https://<user>.github.io/envira-site/`, build with the repo name as base path:

```bash
NEXT_PUBLIC_BASE_PATH=/envira-site npm run build
```

## Layout

| Path | What it is |
| --- | --- |
| `app/layout.js` | `<html>`/`<head>`: title, viewport, Google Fonts |
| `app/page.js` | All page markup (hero, story beats, footer). Booking link is `BOOKING_URL` at the top. |
| `app/globals.css` | All styles, unchanged from the original |
| `assets/sky.webp` | Hero sky photo (was a 1.25 MB base64 string inside the CSS) |
| `components/Scene.js` | Client component that loads the 3D scene after the page mounts |
| `lib/scene.js` | three.js chip scene, scroll-snapping story, tooltips (GSAP for the snap tween) |

## What changed vs. the original

Verified identical: every element's computed style and layout box matches the original at 1512x945 and 390x844, and the WebGL output is bit-identical at all 9 story beats (reduced-motion mode, frozen clock, 3024x1890).

- Sky photo is a WebP file (406 KB) instead of a base64 JPEG inside the CSS (940 KB). Total page download drops from ~1.12 MB to ~0.75 MB gzipped, and assets are cached separately.
- Removed an invisible fullscreen render pass (its alpha was always 0) and canvas-level antialiasing that had no effect.
- Rendering is capped at 60fps. On 120Hz screens the original drew every frame twice as often.
- Fixed a crash when the page loads in a zero-height frame (NaN scroll position killed the render loop).

## Adaptive 3D quality

The scene is GPU-heavy: at level 0 (the original look) it keeps an M5 GPU at ~86%. On a fanless laptop that heats up and throttles, which shows up as lag. So `lib/scene.js` watches its own frame rate: if more than a quarter of frames arrive late over ~2 seconds, it drops one level.

| Level | Settings | GPU use, M5 at 1280x720@2x, 60fps |
| --- | --- | --- |
| 0 | 4x MSAA, 2x pixel ratio (original look) | ~86% |
| 1 | 2x MSAA, 2x pixel ratio | ~58% |
| 2 | 2x MSAA, 1.5x pixel ratio | ~51% |

Machines that keep up stay at level 0. Compare levels with `?quality=0`, `?quality=1` or `?quality=2` (this turns the watchdog off). When it steps down it logs `Envira: ... 3D quality level N` to the browser console.

Other measured options that were not worth it: bloom off or CSS blurs off (no gain), 30fps (~66%, choppy), 1x pixel ratio (~47%, visibly soft).
