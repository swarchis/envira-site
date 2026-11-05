# Envira website

Next.js (App Router) site, exported as static files. Ported 1:1 from the original single-file `index.html` (still in git history), with the same markup, CSS and three.js scene.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 with hot reload
```

## Build a static site

```bash
npm run build      # writes plain HTML/JS/CSS to out/
npm run preview    # serves out/ at http://localhost:3000
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

## GPU cost (known issue)

The scene keeps an M5 GPU at ~85% utilization at 1512x945@2x, at 60fps (macOS `ioreg` Device Utilization). Nearly all of it is the 4x-MSAA HDR render at retina resolution. Measured alternatives, each changes the look slightly:

| Change | GPU utilization |
| --- | --- |
| Current | ~86% |
| 2x MSAA instead of 4x | ~66% |
| 1.5x pixel ratio instead of 2x | ~76% |
| 30fps | ~66% |
| 1x pixel ratio | ~47% |
| Bloom off / CSS blurs off | ~86% (no gain) |
