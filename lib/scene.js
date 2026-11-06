// Envira chip scene (three.js + GSAP). Ported from the original single-file index.html.
// Runs once on the client; it drives the fixed #gl canvas and the scroll story DOM.
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Camera,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  EdgesGeometry,
  Group,
  HalfFloatType,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

var reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
  clamp = (i, e = 0, t = 1) => Math.min(t, Math.max(e, i)),
  lerp = (i, e, t) => i + (e - i) * t,
  smooth = (i) => i * i * (3 - 2 * i),
  easeOutCubic = (i) => 1 - Math.pow(1 - i, 3),
  span = (i, e, t) => clamp((t - i) / (e - i)),
  bump = (i, e, t) => smooth(clamp(1 - Math.abs(i - e) / t)),
  WAVE_BITS = "01101001110100101101";
function clockPoints(i, e, t, n, s = 0) {
  let r = [],
    o = t;
  for (let a = s; a < s + i; a += e)
    r.push(`${a},${o}`), r.push(`${a + e},${o}`), (o = o === t ? n : t);
  return r.join(" ");
}
function bitPoints(i, e, t, n, s = 0) {
  let r = [],
    o = null;
  return (
    [...i].forEach((a, l) => {
      let c = a === "1" ? t : n,
        h = s + l * e;
      o !== null && o !== c && r.push(`${h},${o}`),
        r.push(`${h},${c}`),
        (o = c);
    }),
    r.push(`${s + i.length * e},${o}`),
    r.join(" ")
  );
}
document
  .getElementById("sclk")
  .setAttribute("points", clockPoints(360, 9, 4, 18));
document
  .getElementById("sgold")
  .setAttribute("points", bitPoints(WAVE_BITS, 18, 36, 52));
document
  .getElementById("sfix")
  .setAttribute("points", bitPoints(WAVE_BITS, 18, 36, 52));
var C_TRACE = 12158072,
  C_CLEAR = 1511962,
  C_DIE_TOP = 1972256,
  C_RED = 16734830,
  C_GLOW = 16754814,
  C_GLOW_WAVE = 16754814,
  glowGold = new Color(16754814).multiplyScalar(3.2),
  glowRed = new Color(16726876).multiplyScalar(2.6),
  glowSoft = new Color(16754814).multiplyScalar(1.6),
  color = (i) => new Color(i),
  canvas = document.getElementById("gl"),
  renderer = new WebGLRenderer({
    canvas: canvas,
    // The composer renders into its own 4x MSAA target and only a fullscreen quad reaches the
    // canvas, so canvas-level antialiasing was pure GPU cost with no visible effect.
    antialias: false,
    powerPreference: "high-performance",
  });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(C_CLEAR, 1);
var scene = new Scene(),
  chip = new Group();
scene.add(chip);
var skyEl = document.getElementById("sky"),
  skyImg = {
    value: null,
  },
  skyImgAspect = {
    value: 1.53,
  };
var camera = new OrthographicCamera(-1, 1, 1, -1, 1, 600),
  SKY_FRAG = `precision highp float;
uniform float uTime,uDusk,uAlpha,uAspect,uImgA;uniform sampler2D uImg;varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  // cover-fit the photo to the viewport, with a very slow breathing zoom
  float z=1.015+.012*sin(uTime*.06);
  vec2 s=uAspect>uImgA?vec2(1.,uImgA/uAspect):vec2(uAspect/uImgA,1.);
  vec3 col=texture2D(uImg,(uv-.5)*s/z+.5).rgb;
  // sink the lower part of the frame into the page background
  col*=mix(.12,1.,smoothstep(.04,.58,uv.y));
  vec3 dusk=col*.13+vec3(.07,.05,.085);
  col=mix(col,dusk,uDusk);
  gl_FragColor=vec4(pow(col,vec3(2.2)),uAlpha);}`,
  makeSkyMaterial = (i) =>
    new ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
        },
        uDusk: {
          value: i,
        },
        uAlpha: {
          value: 1,
        },
        uAspect: {
          value: 1,
        },
        uImg: skyImg,
        uImgA: skyImgAspect,
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: SKY_FRAG,
      transparent: !0,
      depthTest: !1,
      depthWrite: !1,
    }),
  quadCamera = new Camera(),
  skyScene = new Scene(),
  skyMat = makeSkyMaterial(1);
// The original also drew a second fullscreen "sky overlay" pass on top of the chip, but its
// alpha was forced to 0 every frame, so it never changed a pixel. Removed.
{
  let t = new Mesh(new PlaneGeometry(2, 2), skyMat);
  (t.frustumCulled = !1), skyScene.add(t);
}
// Post chain: 4x MSAA HDR target -> sky -> chip -> bloom -> output.
// Measured on an M5 at 1512x945@2x: this scene holds the GPU at ~85%. Nearly all of it is the
// MSAA scene render at retina resolution (bloom and the CSS blurs are close to free).
var composer = new EffectComposer(
  renderer,
  new WebGLRenderTarget(innerWidth, innerHeight, {
    type: HalfFloatType,
    samples: 4,
  }),
);
composer.addPass(new RenderPass(skyScene, quadCamera));
{
  let i = new RenderPass(scene, camera);
  (i.clear = !1), composer.addPass(i);
}
var bloomPass = new UnrealBloomPass(new Vector2(256, 256), 1, 0.55, 0.95);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Adaptive quality. Level 0 is the original look. If the GPU can't keep up (e.g. a fanless
// MacBook Air that has heated up and throttled), the frame watchdog in loop() steps down.
// Measured GPU use on an M5 at 1512x945@2x, 60fps: level 0 ~86%, 2x MSAA ~66%, 1.5x ~76%.
// Force a level for comparison with ?quality=0|1|2 (disables the watchdog).
const QUALITY = [
  { samples: 4, maxPixelRatio: 2 },
  { samples: 2, maxPixelRatio: 2 },
  { samples: 2, maxPixelRatio: 1.5 },
];
let quality = 0;
const forcedQuality = (() => {
  const q = new URLSearchParams(location.search).get("quality");
  return q !== null && QUALITY[+q] ? +q : null;
})();
const pixelRatio = () => Math.min(devicePixelRatio, QUALITY[quality].maxPixelRatio);
function setQuality(level) {
  quality = level;
  for (const t of [composer.renderTarget1, composer.renderTarget2]) {
    t.samples = QUALITY[level].samples;
    t.dispose(); // reallocated with the new sample count on next render
  }
  resize();
}
var UNIT = 0.01,
  DIE_W = 800,
  DIE_H = 540,
  toX = (i) => i * UNIT - (DIE_W * UNIT) / 2,
  toZ = (i) => i * UNIT - (DIE_H * UNIT) / 2,
  lineMaterials = [],
  lineMat = (i, e, t = {}) => {
    let n = new LineMaterial({
      color: i,
      linewidth: e,
      ...t,
    });
    return lineMaterials.push(n), n;
  },
  C_EDGE = 7229018,
  C_RIM = 14988194;
function boxMats(i, e, t) {
  let n = (s) =>
    new MeshBasicMaterial({
      color: s,
      polygonOffset: !0,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  return [n(e), n(e), n(i), n(t), n(t), n(t)];
}
function addEdges(i, e = 1, t = C_EDGE) {
  let n = new LineSegmentsGeometry().fromEdgesGeometry(
      new EdgesGeometry(i.geometry),
    ),
    s = new LineSegments2(n, lineMat(t, e * 0.9));
  i.add(s);
  let r = i.geometry.parameters;
  if (r && r.height !== void 0) {
    let o = r.width / 2,
      a = r.height / 2 + 6e-4,
      l = r.depth / 2,
      c = new LineSegmentsGeometry();
    c.setPositions([
      -o,
      a,
      -l,
      o,
      a,
      -l,
      o,
      a,
      -l,
      o,
      a,
      l,
      o,
      a,
      l,
      -o,
      a,
      l,
      -o,
      a,
      l,
      -o,
      a,
      -l,
    ]);
    let h = new LineSegments2(c, lineMat(C_RIM, e * 0.9));
    i.add(h), (s.userData.rim = h);
  }
  return s;
}
function addBox(i, e, t, n, s, r, o, a = 1, l = chip) {
  let c = new Mesh(new BoxGeometry(t * UNIT, s, n * UNIT), o);
  return (
    c.position.set(toX(i + t / 2), r + s / 2, toZ(e + n / 2)),
    (c.userData.edge = addEdges(c, a)),
    l.add(c),
    c
  );
}
function addLines(i, e, t, n, s = chip, r) {
  let o = [];
  i.forEach(([c, h, u, d]) => o.push(toX(c), e, toZ(h), toX(u), e, toZ(d)));
  let a = new LineSegmentsGeometry();
  a.setPositions(o);
  let l = new LineSegments2(a, lineMat(t, n, r));
  return s.add(l), l;
}
var rectSegs = (i, e, t, n) => [
  [i, e, i + t, e],
  [i + t, e, i + t, e + n],
  [i + t, e + n, i, e + n],
  [i, e + n, i, e],
];
function pathSegs(i) {
  let e = [];
  for (let t = 0; t < i.length - 1; t++) e.push([...i[t], ...i[t + 1]]);
  return e;
}
function wavePath(i, e, t, n, s) {
  let r = [],
    o = null;
  return (
    [...i].forEach((a, l) => {
      let c = a === "1" ? n : s,
        h = e + l * t;
      o !== null && o !== c && r.push([h, o]), r.push([h, c]), (o = c);
    }),
    r.push([e + i.length * t, o]),
    r
  );
}
var gridMat = new ShaderMaterial({
    transparent: !0,
    depthWrite: !1,
    uniforms: {
      uC: {
        value: new Vector2(),
      },
      uR: {
        value: 12,
      },
      uMinor: {
        value: 1,
      },
      uCol: {
        value: new Color(4864590),
      },
    },
    vertexShader:
      "varying vec2 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);vP=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}",
    fragmentShader: `uniform vec2 uC;uniform float uR,uMinor;uniform vec3 uCol;varying vec2 vP;
    float g(vec2 p,float s){vec2 q=p/s;vec2 d=abs(fract(q-.5)-.5)/fwidth(q);return 1.-min(min(d.x,d.y),1.);}
    void main(){float a=max(max(g(vP,.5)*.28*uMinor,g(vP,2.5)*.55),g(vP,10.)*.7);float f=1.-smoothstep(uR*.25,uR,length(vP-uC));gl_FragColor=vec4(uCol,a*f);}`,
  }),
  grid = new Mesh(new PlaneGeometry(900, 900), gridMat);
grid.rotation.x = -Math.PI / 2;
grid.position.y = -0.236;
grid.renderOrder = -1;
scene.add(grid);
var shadowCanvas = document.createElement("canvas");
shadowCanvas.width = shadowCanvas.height = 256;
{
  let i = shadowCanvas.getContext("2d");
  (i.filter = "blur(16px)"),
    (i.fillStyle = "#000"),
    i.fillRect(44, 44, 168, 168);
}
var shadow = new Mesh(
  new PlaneGeometry(DIE_W * UNIT * 1.52, DIE_H * UNIT * 1.52),
  new MeshBasicMaterial({
    map: new CanvasTexture(shadowCanvas),
    color: 394248,
    transparent: !0,
    opacity: 0.75,
    depthWrite: !1,
  }),
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.set(0.38, -0.234, 0.42);
chip.add(shadow);
{
  let i = [];
  [
    [0, 0, -1, -1],
    [DIE_W, 0, 1, -1],
    [0, DIE_H, -1, 1],
    [DIE_W, DIE_H, 1, 1],
  ].forEach(([e, t, n, s]) => {
    let r = e + n * 44,
      o = t + s * 44;
    i.push([r - 18, o, r + 18, o], [r, o - 18, r, o + 18]);
  }),
    addLines(i, -0.232, C_GLOW, 1.2).material.color.copy(glowSoft);
}
addLines(
  [
    [0, -34, DIE_W, -34],
    [0, -42, 0, -26],
    [DIE_W, -42, DIE_W, -26],
  ],
  -0.232,
  9074820,
  0.7,
);
addLines(
  [
    [-34, 0, -34, DIE_H],
    [-42, 0, -26, 0],
    [-42, DIE_H, -26, DIE_H],
  ],
  -0.232,
  9074820,
  0.7,
);
addBox(
  0,
  0,
  DIE_W,
  DIE_H,
  0.22,
  -0.22,
  boxMats(C_DIE_TOP, 1117460, 1511963),
  1.3,
);
addLines(
  [
    ...rectSegs(6, 6, DIE_W - 12, DIE_H - 12),
    ...rectSegs(10, 10, DIE_W - 20, DIE_H - 20),
  ],
  0.002,
  5916246,
  0.6,
);
{
  let i = [];
  [
    [34, 34, 1, 1],
    [DIE_W - 34, 34, -1, 1],
    [34, DIE_H - 34, 1, -1],
    [DIE_W - 34, DIE_H - 34, -1, -1],
  ].forEach(([e, t, n, s]) =>
    i.push([e, t, e + 16 * n, t], [e, t, e, t + 16 * s]),
  ),
    addLines(i, 0.002, 10122368, 0.8);
}
var seed = 7,
  rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
{
  let i = [];
  for (let e = 60; e < DIE_H - 40; e += 36) i.push([30, e, DIE_W - 30, e]);
  for (let e = 60; e < DIE_W - 40; e += 44) i.push([e, 30, e, DIE_H - 30]);
  addLines(i, 0.0015, 2498090, 0.5);
}
{
  let i = [];
  for (let e = 0; e < 70; e++) {
    let t = Math.floor(rand() * 4),
      n,
      s;
    if (t < 2) {
      (n = 40 + Math.round(rand() * 36) * 20), (s = t ? DIE_H - 26 : 26);
      let r = t ? DIE_H - 40 - rand() * 90 : 40 + rand() * 90,
        o = n + (rand() - 0.5) * 160;
      i.push([n, s, n, r], [n, r, o, r]);
    } else {
      (s = 44 + Math.round(rand() * 23) * 20), (n = t === 2 ? 26 : DIE_W - 26);
      let r = t === 2 ? 40 + rand() * 90 : DIE_W - 40 - rand() * 90,
        o = s + (rand() - 0.5) * 120;
      i.push([n, s, r, s], [r, s, r, o]);
    }
  }
  addLines(i, 0.0025, 4075588, 0.55);
}
{
  let i = [];
  for (let n = 40; n <= DIE_W - 40; n += 20) i.push([n, 18], [n, DIE_H - 18]);
  for (let n = 44; n <= DIE_H - 44; n += 20) i.push([18, n], [DIE_W - 18, n]);
  let e = new InstancedMesh(
      new BoxGeometry(0.12, 0.016, 0.12),
      boxMats(4863552, 1840158, 2365990),
      i.length,
    ),
    t = new Object3D();
  i.forEach(([n, s], r) => {
    t.position.set(toX(n), 0.008, toZ(s)),
      t.updateMatrix(),
      e.setMatrixAt(r, t.matrix);
  }),
    chip.add(e);
}
{
  let i = [],
    e = [];
  [
    [40, 458, 170, 46],
    [290, 458, 480, 46],
  ].forEach(([s, r, o, a]) => {
    i.push(...rectSegs(s, r, o, a));
    for (let l = r + 3; l < r + a - 3; l += 6) {
      let c = s + 3;
      for (; c < s + o - 6; ) {
        let h = 3 + Math.floor(rand() * 4) * 2.5;
        if (c + h > s + o - 3) break;
        rand() > 0.12 && e.push([c + h / 2, l + 2.5, h]), (c += h + 1);
      }
    }
  }),
    addLines(i, 0.002, 5916246, 0.6);
  let t = new InstancedMesh(
      new BoxGeometry(1, 0.008, 0.045),
      boxMats(3812414, 1708830, 2234918),
      e.length,
    ),
    n = new Object3D();
  e.forEach(([s, r, o], a) => {
    n.position.set(toX(s), 0.004, toZ(r)),
      n.scale.set(o * UNIT, 1, 1),
      n.updateMatrix(),
      t.setMatrixAt(a, n.matrix);
  }),
    chip.add(t);
}
var C_STEP_ON = new Color(15769726).multiplyScalar(1.45),
  C_AGENT_ON = color(4073524),
  C_TOP = color(C_DIE_TOP),
  C_STEP_DONE = color(5914704),
  C_TRACE_COLOR = color(C_TRACE),
  C_BUS = color(6178904),
  C_BUS_RED = color(C_RED),
  C_LIGHT = color(13816008),
  C_SIDE = 1117460,
  C_BOTTOM = 1446170,
  STAGES = ["SEED", "BUG", "AGENT", "SIM", "REWARD"],
  stageGroups = {};
STAGES.forEach((i) => {
  (stageGroups[i] = new Group()), chip.add(stageGroups[i]);
});
var hoverables = [];
function addStage(i, e, t, n, s, r, o = 1) {
  let a = addBox(
    e,
    t,
    n,
    s,
    r,
    0,
    boxMats(C_DIE_TOP, C_SIDE, C_BOTTOM),
    o,
    stageGroups[i],
  );
  return (a.userData.key = i), hoverables.push(a), a;
}
addStage("SEED", 40, 40, 170, 200, 0.08);
addStage("BUG", 40, 310, 170, 130, 0.08);
var agentBlock = addStage("AGENT", 290, 40, 260, 400, 0.14, 1.4);
addStage("SIM", 630, 40, 140, 200, 0.08);
addStage("REWARD", 630, 310, 140, 130, 0.08);
{
  let i = [];
  for (let n = 56; n <= 196; n += 10)
    for (let s = 76; s <= 226; s += 8) i.push([n, s]);
  let e = new InstancedMesh(
      new BoxGeometry(0.075, 0.014, 0.055),
      boxMats(9068648, 3022888, 3811378),
      i.length,
    ),
    t = new Object3D();
  i.forEach(([n, s], r) => {
    t.position.set(toX(n), 0.087, toZ(s)),
      t.updateMatrix(),
      e.setMatrixAt(r, t.matrix);
  }),
    stageGroups.SEED.add(e);
}
var addSubBlock = (i, e, t, n, s, r) =>
  addBox(
    e,
    t,
    n,
    s,
    0.02,
    r,
    boxMats(C_DIE_TOP, C_SIDE, C_BOTTOM),
    0.7,
    stageGroups[i],
  );
addSubBlock("BUG", 56, 346, 64, 36, 0.08);
addSubBlock("BUG", 132, 346, 62, 36, 0.08);
addSubBlock("BUG", 56, 392, 138, 32, 0.08);
addSubBlock("SIM", 646, 80, 108, 70, 0.08);
addSubBlock("SIM", 646, 162, 108, 62, 0.08);
addSubBlock("REWARD", 646, 350, 108, 72, 0.08);
addLines(
  pathSegs(wavePath("01101001", 652, 12, 98, 128)),
  0.101,
  C_GLOW_WAVE,
  3.4,
  stageGroups.SIM,
).material.color.copy(glowSoft);
var simFixWave = addLines(
  pathSegs(wavePath("01101001", 652, 12, 98, 128)),
  0.103,
  15854303,
  1.2,
  stageGroups.SIM,
);
addLines(
  pathSegs(wavePath("1010101010101010", 652, 6, 176, 196)),
  0.101,
  9074820,
  0.8,
  stageGroups.SIM,
);
var rewardBar = new Mesh(
  new BoxGeometry(1, 0.01, 0.08),
  new MeshBasicMaterial({
    color: glowGold.clone(),
  }),
);
rewardBar.geometry.translate(0.5, 0, 0);
rewardBar.position.set(toX(660), 0.106, toZ(400));
rewardBar.scale.x = 1e-4;
stageGroups.REWARD.add(rewardBar);
var STEP_NAMES = ["read", "search", "edit", "compile", "test"],
  steps = STEP_NAMES.map((i, e) => {
    let t = new MeshBasicMaterial({
        color: C_DIE_TOP,
        polygonOffset: !0,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
      n = boxMats(C_DIE_TOP, C_SIDE, C_BOTTOM);
    n[2] = t;
    let s = new Mesh(new BoxGeometry(2.28, 0.03, 0.6), n);
    return (
      s.position.set(toX(420), 0.155, toZ(84 + e * 70 + 30)),
      addEdges(s, 0.8),
      (s.userData.key = "AGENT"),
      stageGroups.AGENT.add(s),
      hoverables.push(s),
      {
        m: s,
        top: t,
        name: i,
        z: toZ(84 + e * 70 + 30),
      }
    );
  }),
  stepCursor = new Mesh(
    new BoxGeometry(0.025, 0.004, 0.56),
    new MeshBasicMaterial({
      color: new Color(16772580).multiplyScalar(2.2),
    }),
  );
stepCursor.visible = !1;
stageGroups.AGENT.add(stepCursor);
var agentScan = new Group();
agentScan.position.set(toX(420), 0.16, toZ(240));
chip.add(agentScan);
var agentScanGeo = new LineSegmentsGeometry();
{
  let i = [];
  rectSegs(-130, -200, 260, 400).forEach(([e, t, n, s]) =>
    i.push(e * UNIT, 0, t * UNIT, n * UNIT, 0, s * UNIT),
  ),
    agentScanGeo.setPositions(i);
}
var agentScanRing = new LineSegments2(
  agentScanGeo,
  lineMat(C_GLOW, 2, {
    transparent: !0,
  }),
);
agentScanRing.material.color.copy(glowGold);
agentScanRing.visible = !1;
agentScan.add(agentScanRing);
var buses = [
    {
      a: [125, 240],
      b: [125, 310],
      c: C_TRACE,
      r: [0.35, 1],
    },
    {
      a: [210, 375],
      b: [290, 375],
      c: C_RED,
      r: [1.3, 1.85],
    },
    {
      a: [550, 140],
      b: [630, 140],
      c: C_TRACE,
      r: [3.1, 3.5],
    },
    {
      a: [700, 240],
      b: [700, 310],
      c: C_TRACE,
      r: [4.15, 4.45],
    },
    {
      a: [630, 405],
      b: [550, 405],
      c: C_TRACE,
      r: [4.5, 4.85],
    },
  ],
  busHead = new Mesh(
    new BoxGeometry(0.1, 0.03, 0.1),
    new MeshBasicMaterial({
      color: glowGold.clone(),
    }),
  );
busHead.visible = !1;
chip.add(busHead);
buses.forEach((i) => {
  let e = Math.sign(i.b[0] - i.a[0]),
    t = Math.sign(i.b[1] - i.a[1]),
    n = Math.hypot(i.b[0] - i.a[0], i.b[1] - i.a[1]) * UNIT,
    s = [];
  [-7, 7].forEach((a) =>
    s.push(
      e
        ? [i.a[0], i.a[1] + a, i.b[0], i.b[1] + a]
        : [i.a[0] + a, i.a[1], i.b[0] + a, i.b[1]],
    ),
  ),
    (i.bus = addLines(s, 0.003, 6178904, 0.8));
  let r = new BoxGeometry(n, 0.012, 0.045);
  r.translate(n / 2, 0, 0);
  let o = new Mesh(
    r,
    new MeshBasicMaterial({
      color: (i.c === C_RED ? glowRed : glowGold).clone(),
    }),
  );
  (i.base = i.c === C_RED ? glowRed : glowGold),
    o.position.set(toX(i.a[0]), 0.008, toZ(i.a[1])),
    (o.rotation.y =
      e > 0 ? 0 : e < 0 ? Math.PI : t > 0 ? -Math.PI / 2 : Math.PI / 2),
    (o.scale.x = 1e-4),
    (o.visible = !1),
    chip.add(o),
    (i.m = o),
    (i.pk = [0, 1, 2].map(() => {
      let a = new Mesh(
        new BoxGeometry(0.05, 0.02, 0.05),
        new MeshBasicMaterial({
          color: C_GLOW,
        }),
      );
      return (a.visible = !1), chip.add(a), a;
    }));
});
function textTexture(i, e, t, n) {
  let s = document.createElement("canvas"),
    r = s.getContext("2d"),
    o = `${n} ${e}px Figtree, 'Helvetica Neue', sans-serif`;
  r.font = o;
  let a = e * 0.16,
    l = 0;
  for (let u of i) l += r.measureText(u).width + a;
  (s.width = Math.ceil(l + 8)),
    (s.height = Math.ceil(e * 1.3)),
    (r.font = o),
    (r.fillStyle = t),
    (r.textBaseline = "middle");
  let c = 4;
  for (let u of i)
    r.fillText(u, c, s.height / 2), (c += r.measureText(u).width + a);
  let h = new CanvasTexture(s);
  return (
    (h.colorSpace = SRGBColorSpace),
    (h.anisotropy = 8),
    (h.userData = {
      a: s.width / s.height,
    }),
    h
  );
}
function addLabel(
  i,
  e,
  t,
  n,
  s,
  { color: r = "#E9E1D5", weight: o = 500, parent: a = chip } = {},
) {
  let l = textTexture(i, 96, r, o),
    c = s,
    h = s * l.userData.a,
    u = new Mesh(
      new PlaneGeometry(h, c),
      new MeshBasicMaterial({
        map: l,
        transparent: !0,
        depthWrite: !1,
      }),
    );
  return (
    (u.rotation.x = -Math.PI / 2),
    u.position.set(toX(e) + h / 2, n + 0.002, toZ(t) + c / 2),
    a.add(u),
    u
  );
}
var wafer = new Group();
chip.add(wafer);
var WAFER_R = 66,
  DIE_PITCH_X = 8.3,
  DIE_PITCH_Z = 6.1,
  waferMats = boxMats(1774880, 1117460, 1117460).map(
    (i) => ((i.transparent = !0), (i.opacity = 0), i),
  ),
  waferDisk = new Mesh(new CylinderGeometry(WAFER_R, WAFER_R, 0.3, 160), [
    waferMats[0],
    waferMats[2],
    waferMats[3],
  ]);
waferDisk.position.y = -0.38;
waferDisk.visible = !1;
wafer.add(waferDisk);
var waferRimPts = [];
for (let i = 0; i < 160; i++) {
  let e = (i / 160) * Math.PI * 2,
    t = ((i + 1) / 160) * Math.PI * 2;
  waferRimPts.push(
    Math.cos(e) * WAFER_R,
    -0.229,
    Math.sin(e) * WAFER_R,
    Math.cos(t) * WAFER_R,
    -0.229,
    Math.sin(t) * WAFER_R,
  );
}
waferRimPts.push(
  -3,
  -0.229,
  WAFER_R - 0.1,
  0,
  -0.229,
  WAFER_R - 2.4,
  0,
  -0.229,
  WAFER_R - 2.4,
  3,
  -0.229,
  WAFER_R - 0.1,
);
var waferRimGeo = new LineSegmentsGeometry();
waferRimGeo.setPositions(waferRimPts);
var waferRim = new LineSegments2(waferRimGeo, lineMat(C_GLOW, 1.6));
waferRim.material.color.copy(glowSoft);
waferRim.visible = !1;
wafer.add(waferRim);
var dies = [];
for (let i = -9; i <= 9; i++)
  for (let e = -12; e <= 12; e++) {
    if (!i && !e) continue;
    let t = i * DIE_PITCH_X,
      n = e * DIE_PITCH_Z;
    [
      [t - 3.8, n - 2.7],
      [t + 3.8, n - 2.7],
      [t - 3.8, n + 2.7],
      [t + 3.8, n + 2.7],
    ].every(([s, r]) => Math.hypot(s, r) < WAFER_R - 3) && dies.push([t, n]);
  }
dies.sort((i, e) => Math.hypot(...i) - Math.hypot(...e));
var dieCount = dies.length,
  C_WHITE = new Color(16777215),
  C_DIE_FLASH = new Color(16754814).multiplyScalar(9),
  tmpColor = new Color(),
  dieMesh = new InstancedMesh(
    new BoxGeometry(7.6, 0.22, 5.4),
    boxMats(C_DIE_TOP, 1117460, 1511963),
    dieCount,
  );
dieMesh.instanceMatrix.setUsage(DynamicDrawUsage);
dieMesh.count = 0;
for (let i = 0; i < dieCount; i++) dieMesh.setColorAt(i, C_WHITE);
wafer.add(dieMesh);
var dieOutlineGeo = new LineSegmentsGeometry();
{
  let i = [];
  dies.forEach(([e, t]) =>
    i.push(
      e - 3.8,
      0.001,
      t - 2.7,
      e + 3.8,
      0.001,
      t - 2.7,
      e + 3.8,
      0.001,
      t - 2.7,
      e + 3.8,
      0.001,
      t + 2.7,
      e + 3.8,
      0.001,
      t + 2.7,
      e - 3.8,
      0.001,
      t + 2.7,
      e - 3.8,
      0.001,
      t + 2.7,
      e - 3.8,
      0.001,
      t - 2.7,
    ),
  ),
    dieOutlineGeo.setPositions(i);
}
dieOutlineGeo.instanceCount = 0;
var dieOutlines = new LineSegments2(dieOutlineGeo, lineMat(C_TRACE, 0.8));
wafer.add(dieOutlines);
var tmpObj = new Object3D(),
  SHOTS = [
    {
      u: 400,
      v: 270,
      z: 1,
      el: 36,
      az: 38,
    },
    {
      u: 150,
      v: 260,
      z: 1.9,
      el: 40,
      az: 28,
    },
    {
      u: 250,
      v: 360,
      z: 1.9,
      el: 34,
      az: 44,
    },
    {
      u: 420,
      v: 240,
      z: 1.35,
      el: 44,
      az: 36,
    },
    {
      u: 690,
      v: 190,
      z: 1.8,
      el: 38,
      az: 50,
    },
    {
      u: 590,
      v: 300,
      z: 1.4,
      el: 42,
      az: 40,
    },
    {
      u: 400,
      v: 270,
      z: 1,
      el: 32,
      az: 34,
    },
    {
      u: 400,
      v: 270,
      z: 0.072,
      el: 48,
      az: 30,
    },
    {
      u: 400,
      v: 270,
      z: 0.08,
      el: 52,
      az: 30,
    },
  ],
  pointer = {
    x: 0,
    y: 0,
    sx: 0,
    sy: 0,
  };
addEventListener("pointermove", (i) => {
  (pointer.x = (i.clientX / innerWidth) * 2 - 1),
    (pointer.y = (i.clientY / innerHeight) * 2 - 1);
});
// Per-stop framing of the die (fractions of the viewport). Stops 1-2 keep the die right of the
// Chapter I dossier; stops 4-6 lift it above the Chapter II report docked along the bottom.
var VIEW_OFFSETS = [
    [-0.17, 0],
    [-0.19, 0],
    [-0.19, 0],
    [-0.08, 0.15],
    [0, 0.21],
    [0, 0.21],
    [0, 0.21],
    [0.16, 0],
    [0, 0],
  ],
  isMobile = !1,
  viewSize = 4,
  vw = innerWidth,
  vh = innerHeight,
  camDir = new Vector3();
function resize() {
  let i = innerWidth,
    e = innerHeight,
    t = i / e;
  (isMobile = i < 760),
    (vw = i),
    (vh = e),
    renderer.setPixelRatio(pixelRatio()),
    renderer.setSize(i, e, !1),
    (skyMat.uniforms.uAspect.value = t),
    composer.setPixelRatio(pixelRatio()),
    composer.setSize(i, e),
    (viewSize = isMobile ? Math.max(5.6, 4.4 / t) : Math.max(3.6, 8.4 / t)),
    (camera.left = -viewSize * t),
    (camera.right = viewSize * t),
    (camera.top = viewSize),
    (camera.bottom = -viewSize),
    camera.up.set(...(isMobile ? [0, 0, -1] : [0, 1, 0])),
    lineMaterials.forEach((n) => n.resolution.set(i, e)),
    (needsRender = !0);
}
var byId = (i) => document.getElementById(i),
  stepEls = [...document.querySelectorAll("#steps li")],
  simFixEl = byId("sfixg"),
  passEl = byId("pass"),
  countEl = byId("count"),
  // Story blocks: single beats (data-i) and pinned chapters spanning stops data-from..data-to.
  storyEls = [...document.querySelectorAll(".beat,.chapter")].map((el) => {
    let from = +(el.dataset.from ?? el.dataset.i),
      to = +(el.dataset.to ?? from),
      q = (sel) => [...el.querySelectorAll(sel)];
    return {
      el,
      copy: el.querySelector(".copy"),
      from,
      to,
      chapter: el.classList.contains("chapter"),
      panes: q(".pane"),
      marks: q(".rail li,.tabs [data-k]"),
      facts: q("[data-at]"),
      cur: el.querySelector(".cur"),
      lastK: -1,
    };
  }),
  tipEl = byId("tip");
var TIPS = {
    SEED: [
      "Seed designs",
      "Stage 1",
      "Permissively licensed Verilog. FIFOs, UARTs, timers, interrupt controllers.",
    ],
    BUG: [
      "Bug injector",
      "Stage 2",
      "Injects one realistic fault. Kept only if the hidden tests catch it.",
    ],
    AGENT: [
      "Agent",
      "Stage 3",
      "Reads, searches, edits, compiles and tests inside a real toolchain.",
    ],
    SIM: [
      "Simulator",
      "Stage 4",
      "Runs the fix against hidden tests. Pass or fail, no partial credit.",
    ],
    REWARD: [
      "Reward",
      "Stage 5",
      "Turns the verdict into a training reward for the model.",
    ],
  },
  scrollState = {
    p: 0,
  },
  intro = {
    v: reducedMotion ? 1 : 0,
  },
  buildProgress = 0,
  needsRender = !0,
  animating = !1,
  stepLabels = [],
  stageLabels = {};
var hoveredStage = null,
  camTarget = new Vector3(),
  tmpVec = new Vector3(),
  tmpStepColor = new Color(),
  t0 = performance.now(),
  SPARK_N = 160,
  sparkPos = new Float32Array(SPARK_N * 3).fill(1e5),
  sparkVel = new Float32Array(SPARK_N * 3),
  sparkLife = new Float32Array(SPARK_N),
  sparkGeo = new BufferGeometry();
sparkGeo.setAttribute("position", new BufferAttribute(sparkPos, 3));
var sparks = new Points(
  sparkGeo,
  new PointsMaterial({
    color: glowGold.clone(),
    size: 2.6,
    sizeAttenuation: !1,
    transparent: !0,
    depthWrite: !1,
    blending: AdditiveBlending,
  }),
);
sparks.frustumCulled = !1;
chip.add(sparks);
var arcGeo = new LineSegmentsGeometry();
arcGeo.setPositions([0, 0, 0, 0, 0, 0]);
var arc = new LineSegments2(arcGeo, lineMat(C_GLOW, 1.4));
arc.material.color.copy(glowGold);
arc.visible = !1;
chip.add(arc);
var sparkIdx = 0,
  sparkLastT = 0,
  arcLastT = 0,
  flicker = 1;
function updateSparks(i, e, t) {
  let n = Math.min(0.05, Math.max(0, t - sparkLastT));
  if (((sparkLastT = t), i && !reducedMotion)) {
    let s = toX(i[0]),
      r = toZ(i[1]);
    for (let o = 0; o < 3; o++) {
      let a = sparkIdx++ % SPARK_N;
      (sparkPos[a * 3] = s),
        (sparkPos[a * 3 + 1] = 0.03),
        (sparkPos[a * 3 + 2] = r),
        (sparkVel[a * 3] = (Math.random() - 0.5) * 1.4),
        (sparkVel[a * 3 + 1] = 0.4 + Math.random() * 1.1),
        (sparkVel[a * 3 + 2] = (Math.random() - 0.5) * 1.4),
        (sparkLife[a] = 0.25 + Math.random() * 0.45);
    }
    if (t - arcLastT > 0.05) {
      arcLastT = t;
      let o = [],
        a = s,
        l = 0.03,
        c = r,
        h = Math.random() * Math.PI * 2,
        u = 0.18 + Math.random() * 0.22,
        d = s + Math.cos(h) * u,
        m = r + Math.sin(h) * u;
      for (let g = 1; g <= 6; g++) {
        let _ = g / 6,
          p = lerp(s, d, _) + (Math.random() - 0.5) * 0.06,
          f = lerp(r, m, _) + (Math.random() - 0.5) * 0.06,
          w = 0.03 + Math.sin(_ * Math.PI) * 0.08;
        o.push(a, l, c, p, w, f), (a = p), (l = w), (c = f);
      }
      arcGeo.setPositions(o);
    }
    (arc.visible = Math.random() > 0.25),
      arc.material.color.copy(e ? glowRed : glowGold),
      sparks.material.color.copy(e ? glowRed : glowGold);
  } else arc.visible = !1;
  for (let s = 0; s < SPARK_N; s++)
    sparkLife[s] > 0 &&
      ((sparkLife[s] -= n),
      (sparkVel[s * 3 + 1] -= 2.6 * n),
      (sparkPos[s * 3] += sparkVel[s * 3] * n),
      (sparkPos[s * 3 + 1] += sparkVel[s * 3 + 1] * n),
      (sparkPos[s * 3 + 2] += sparkVel[s * 3 + 2] * n),
      sparkLife[s] <= 0 && (sparkPos[s * 3] = 1e5));
  sparkGeo.attributes.position.needsUpdate = !0;
}
function update(i) {
  let e = reducedMotion ? Math.round(scrollState.p) : scrollState.p,
    t = (i - t0) / 1e3;
  (animating = !reducedMotion),
    (buildProgress = reducedMotion ? 1 : span(0.1, 1, e));
  let n = 1 - span(0.12, 0.8, e) + span(7.2, 7.85, e);
  skyEl &&
    ((n = clamp(n).toFixed(3)),
    skyEl.style.opacity !== n && (skyEl.style.opacity = n)),
    (skyMat.uniforms.uTime.value = reducedMotion ? 0 : t),
    (flicker = 0.7 + 0.3 * Math.abs(Math.sin(t * 31) * Math.sin(t * 17.3)));
  let s = Math.min(7, Math.floor(e)),
    r = smooth(clamp(e - s)),
    o = SHOTS[s],
    a = SHOTS[s + 1];
  if (
    (camTarget.set(toX(lerp(o.u, a.u, r)), 0, toZ(lerp(o.v, a.v, r))), isMobile)
  )
    camDir.set(0, 1, 1e-4);
  else {
    (pointer.sx += (pointer.x - pointer.sx) * 0.05),
      (pointer.sy += (pointer.y - pointer.sy) * 0.05);
    let E = reducedMotion ? 0 : Math.sin(t * 0.3) * 1.4,
      R = reducedMotion ? 0 : pointer.sx * 4,
      A = reducedMotion ? 0 : pointer.sy * -3,
      T = ((lerp(o.el, a.el, r) + A) * Math.PI) / 180,
      H = ((lerp(o.az, a.az, r) + R + E) * Math.PI) / 180;
    camDir.set(
      Math.cos(T) * Math.sin(H),
      Math.sin(T),
      Math.cos(T) * Math.cos(H),
    );
  }
  {
    let E = isMobile ? 0 : lerp(VIEW_OFFSETS[s][0], VIEW_OFFSETS[s + 1][0], r),
      R = isMobile ? 0.17 : lerp(VIEW_OFFSETS[s][1], VIEW_OFFSETS[s + 1][1], r);
    camera.setViewOffset(vw, vh, E * vw, R * vh, vw, vh);
  }
  camera.position.copy(camTarget).addScaledVector(camDir, 150),
    camera.lookAt(camTarget);
  let l =
    Math.exp(lerp(Math.log(o.z), Math.log(a.z), r)) * (isMobile ? 0.72 : 1);
  (camera.zoom = l),
    camera.updateProjectionMatrix(),
    (chip.rotation.y = smooth(span(7, 8, e)) * 0.22),
    gridMat.uniforms.uC.value.set(camTarget.x, camTarget.z),
    (gridMat.uniforms.uR.value = ((viewSize * (vw / vh)) / l) * 1.15),
    (gridMat.uniforms.uMinor.value = span(0.45, 0.9, l)),
    STAGES.forEach((E, R) => {
      let A = easeOutCubic(span(R * 0.12, R * 0.12 + 0.5, buildProgress)),
        T = stageGroups[E];
      (T.scale.y = Math.max(A, 0.001)),
        (T.visible = A > 0.002),
        (T.position.y = reducedMotion
          ? 0
          : 0.06 * bump(e, R + 1, 0.75) + (hoveredStage === E ? 0.03 : 0)),
        (stageLabels[E] || []).forEach((H) => (H.material.opacity = A));
    });
  let c = null,
    h = !1,
    u = !reducedMotion && e < 6.2;
  buses.forEach((E, R) => {
    let A = span(E.r[0], E.r[1], e);
    (E.m.visible = A > 0), (E.m.scale.x = Math.max(A, 1e-4));
    let T = [toX(E.a[0]), toZ(E.a[1])],
      H = [toX(E.b[0]), toZ(E.b[1])];
    E.m.material.color
      .copy(E.base)
      .multiplyScalar(
        A > 0 && A < 1
          ? 0.8 + flicker * 0.5
          : 0.75 + 0.25 * Math.sin(t * 2 + R),
      ),
      A > 0 &&
        A < 1 &&
        ((c = [lerp(E.a[0], E.b[0], A), lerp(E.a[1], E.b[1], A)]),
        (h = R === 1),
        busHead.material.color
          .copy(R === 1 ? glowRed : glowGold)
          .multiplyScalar(flicker * 1.3));
    let y = !1;
    E.pk.forEach((b, z) => {
      if (
        ((b.visible = u && (A >= 1 || y)),
        b.material.color
          .copy(R === 1 && e > 1.3 ? glowRed : glowGold)
          .multiplyScalar(0.6),
        b.visible)
      ) {
        animating = !0;
        let G = (t * 0.45 + z / 3 + R * 0.17) % 1;
        b.position.set(lerp(T[0], H[0], G), 0.02, lerp(T[1], H[1], G));
      }
    });
  }),
    updateSparks(c, h, t),
    (busHead.visible = !!c),
    c && busHead.position.set(toX(c[0]), 0.02, toZ(c[1])),
    buses[1].bus.material.color.lerpColors(
      C_BUS,
      C_BUS_RED,
      span(1.3, 1.45, e),
    );
  let d = span(3.05, 3.25, e);
  (stepCursor.visible = !1),
    steps.forEach((E, R) => {
      let A = 2.2 + R * 0.16,
        T = e >= A,
        H = T && (R === 4 || e < A + 0.16);
      tmpStepColor
        .copy(T ? (H ? C_STEP_ON : C_STEP_DONE) : C_TOP)
        .lerp(C_TOP, d),
        E.top.color.copy(tmpStepColor);
      let y = easeOutCubic(
        span(0.5 + R * 0.06, 0.72 + R * 0.06, buildProgress),
      );
      if (
        ((E.m.scale.y = Math.max(y, 0.001)),
        (E.m.position.y = 0.14 + 0.015 * y - (H && d < 0.5 ? 0.008 : 0)),
        stepLabels[R] &&
          (stepLabels[R].material.map =
            H && d < 0.5
              ? stepLabels[R].userData.on
              : stepLabels[R].userData.off),
        H && d < 0.5 && !reducedMotion)
      ) {
        let b = clamp((e - A) / 0.16);
        (stepCursor.visible = !0),
          stepCursor.position.set(
            lerp(toX(306) + 0.05, toX(534) - 0.05, b),
            E.m.position.y + 0.017,
            E.z,
          );
      }
      stepEls[R].dataset.s = H ? "on" : T ? "done" : "";
    });
  let m = span(3.4, 4, e),
    g = 1 - easeOutCubic(m);
  simFixEl.setAttribute(
    "transform",
    `translate(${(g * 14).toFixed(2)},${(g * 6).toFixed(2)})`,
  ),
    (passEl.style.opacity = m > 0.97 ? 1 : 0),
    simFixWave.position.set(g * 0.09, 0, g * 0.07),
    (rewardBar.scale.x = Math.max(
      1e-4,
      easeOutCubic(span(4.4, 4.7, e)) * 0.88,
    ));
  let _ = span(4.85, 5.25, e);
  (agentScanRing.visible = !reducedMotion && _ > 0 && _ < 1),
    agentScan.scale.set(
      1 + 0.35 * easeOutCubic(_),
      1,
      1 + 0.25 * easeOutCubic(_),
    ),
    (agentScanRing.material.opacity = 1 - _);
  let p = span(4.8, 5.05, e);
  agentBlock.material[2].color.lerpColors(C_TOP, C_AGENT_ON, p),
    (agentBlock.userData.edge.material.linewidth = (1.4 + p * 1.2) * 0.9),
    agentBlock.userData.edge.material.color.setHex(C_EDGE).lerp(glowSoft, p);
  let f = span(6.05, 7, e),
    w = 0,
    v = 0;
  for (let E = 0; E < dieCount; E++) {
    let R = reducedMotion
      ? f > 0
        ? 1
        : 0
      : clamp((f - (E / dieCount) * 0.7) / 0.2);
    if (R <= 0) break;
    (w = E + 1), R >= 1 && (v = E + 1);
    let A = reducedMotion ? 1 : clamp((f - (E / dieCount) * 0.7 - 0.2) / 0.1);
    dieMesh.setColorAt(
      E,
      tmpColor
        .copy(R >= 1 ? C_DIE_FLASH : C_WHITE)
        .lerp(C_WHITE, R >= 1 ? A : 0),
    ),
      tmpObj.position.set(
        dies[E][0],
        -0.11 + (1 - easeOutCubic(R)) * 2.2,
        dies[E][1],
      ),
      tmpObj.updateMatrix(),
      dieMesh.setMatrixAt(E, tmpObj.matrix);
  }
  (dieMesh.count = w),
    (dieMesh.instanceMatrix.needsUpdate = !0),
    dieMesh.instanceColor && (dieMesh.instanceColor.needsUpdate = !0),
    (dieOutlineGeo.instanceCount = v * 4),
    (dieMesh.visible = w > 0),
    (dieOutlines.visible = v > 0),
    waferMats.forEach((E) => (E.opacity = span(6, 6.4, e))),
    (waferDisk.visible = waferRim.visible = e > 6),
    (shadow.visible = e < 6.1),
    (countEl.textContent = Math.round(
      1009 * smooth(span(6.2, 7, e)),
    ).toLocaleString("en-US")),
    updateStory(reducedMotion ? e : scrollState.raw ?? scrollState.p);
}
// Copy layer. Beats fade/drift around their stop; chapters stay pinned (CSS sticky) across their
// range and cross-fade panes, rail/tab marks and spec rows by local progress k = p - from.
function updateStory(P) {
  storyEls.forEach((B) => {
    let A = P < B.from ? P - B.from : P > B.to ? P - B.to : 0;
    if (!reducedMotion) {
      let op = clamp(1 - Math.max(0, Math.abs(A) - 0.15) * (isMobile ? 3.5 : 2.6));
      B.copy.style.opacity = op;
      B.copy.style.visibility = op < 0.06 ? "hidden" : "";
      B.copy.style.transform = isMobile ? "" : `translateY(${(-A * 18).toFixed(1)}px)`;
    }
    if (!B.chapter) return;
    let n = B.to - B.from,
      k = clamp(P - B.from, 0, n),
      K = Math.round(k);
    B.el.style.setProperty("--k", (k / n).toFixed(4));
    B.el.style.setProperty("--kf", k.toFixed(4));
    B.panes.forEach((el) => {
      let d = +el.dataset.k - k,
        o = reducedMotion ? +(d === 0) : clamp(1 - Math.abs(d) * 2.4);
      el.style.opacity = o.toFixed(3);
      el.style.transform = reducedMotion ? "" : `translateY(${(d * 22).toFixed(1)}px)`;
      // --d drives the per-word stagger and the focus blur in CSS
      el.style.setProperty("--d", reducedMotion ? 0 : clamp(d, -1, 1).toFixed(3));
      el.style.setProperty("--ad", reducedMotion ? 0 : Math.min(1, Math.abs(d)).toFixed(3));
      el.style.visibility = o > 0.001 ? "visible" : "hidden";
    });
    B.facts.forEach((el) => {
      let o = reducedMotion ? +(K >= +el.dataset.at) : clamp((k - +el.dataset.at + 0.55) / 0.4);
      el.style.opacity = (0.18 + 0.82 * o).toFixed(3);
      el.style.setProperty("--on", o.toFixed(3));
    });
    if (K !== B.lastK) {
      B.lastK = K;
      B.marks.forEach((el) => {
        let j = +el.dataset.k;
        el.dataset.s = j === K ? "on" : j < K ? "done" : "";
      });
      B.cur && (B.cur.textContent = String(B.from + K).padStart(2, "0"));
      B.el.classList.toggle("last", K === n);
    }
  });
}
// Render at most ~60 frames per second. On 120Hz displays (MacBook Pro, iPad Pro) the browser
// calls this twice as often; every frame is a full bloom + MSAA pipeline at retina resolution,
// so drawing every other frame halves GPU load. Animation is time-based, so speed is unchanged.
const FRAME_MS = 1000 / 60;
let scrollTick = null; // set by the scroll pager below; stepped once per rendered frame
let lastFrame = -Infinity;

// Frame watchdog: over each window of 120 frames (~2s), if more than a quarter arrive late
// (> 1.4 frame budgets apart), drop one quality level. Ignores the first 3s after load and
// after each change (shader compiles, buffer reallocation) and gaps from hidden tabs.
const SLOW_MS = FRAME_MS * 1.4,
  WATCH_FRAMES = 120;
let watchFrom = performance.now() + 3000,
  lastWatched = 0,
  watchedFrames = 0,
  slowFrames = 0;
function watchFrameRate(now) {
  if (reducedMotion || forcedQuality !== null || quality === QUALITY.length - 1) return;
  const dt = now - lastWatched;
  lastWatched = now;
  if (now < watchFrom || dt > 250) {
    watchedFrames = slowFrames = 0;
    return;
  }
  watchedFrames++;
  if (dt > SLOW_MS) slowFrames++;
  if (watchedFrames < WATCH_FRAMES) return;
  if (slowFrames / watchedFrames > 0.25) {
    console.info(`Envira: ${slowFrames}/${watchedFrames} slow frames, 3D quality level ${quality + 1}`);
    setQuality(quality + 1);
    watchFrom = now + 3000;
  }
  watchedFrames = slowFrames = 0;
}
function loop(i) {
  requestAnimationFrame(loop);
  const now = performance.now(),
    elapsed = now - lastFrame;
  if (elapsed < FRAME_MS - 1) return;
  lastFrame = elapsed < FRAME_MS * 2 ? lastFrame + FRAME_MS : now;
  watchFrameRate(now);
  scrollTick && scrollTick(now);
  (needsRender || animating || intro.v < 1) &&
    ((needsRender = !1),
    chip.updateMatrixWorld(),
    update(i),
    composer.render());
}
var raycaster = new Raycaster(),
  ndc = new Vector2();
addEventListener("pointermove", (i) => {
  let e = null;
  if (
    i.target === canvas &&
    i.pointerType !== "touch" &&
    scrollState.p < 5.6 &&
    scrollState.p > 1
  ) {
    ndc.set(
      (i.clientX / innerWidth) * 2 - 1,
      -(i.clientY / innerHeight) * 2 + 1,
    ),
      raycaster.setFromCamera(ndc, camera);
    let r = raycaster.intersectObjects(hoverables, !1)[0];
    r && (e = r.object.userData.key);
  }
  if ((e !== hoveredStage && ((hoveredStage = e), (needsRender = !0)), !e)) {
    tipEl.classList.remove("on"), (canvas.style.cursor = "");
    return;
  }
  let [t, n, s] = TIPS[e];
  (byId("tipn").textContent = t),
    (byId("tips").textContent = n),
    (byId("tipb").textContent = s),
    (tipEl.style.transform = `translate(${Math.min(i.clientX + 16, innerWidth - 246)}px,${Math.min(i.clientY + 16, innerHeight - 120)}px)`),
    tipEl.classList.add("on"),
    (canvas.style.cursor = "default");
});
document.addEventListener("visibilitychange", () => {
  needsRender = !0;
});
async function buildLabels() {
  try {
    await Promise.race([
      document.fonts.load("500 96px Figtree"),
      new Promise((e) => setTimeout(e, 1200)),
    ]);
  } catch {}
  let i = (e, t, n, s, r, o, a = {}) => {
    let l = addLabel(t, n, s, r, o, {
      ...a,
      parent: stageGroups[e],
    });
    return (stageLabels[e] = stageLabels[e] || []).push(l), l;
  };
  i("SEED", "SEED DESIGNS", 52, 50, 0.08, 0.12),
    i("BUG", "BUG INJECTOR", 52, 320, 0.08, 0.12),
    i("AGENT", "AGENT", 306, 52, 0.14, 0.16, {
      weight: 600,
    }),
    i("SIM", "SIMULATOR", 642, 50, 0.08, 0.12),
    i("REWARD", "REWARD", 642, 320, 0.08, 0.12),
    addLabel("8.00 MM", DIE_W / 2 - 28, -64, -0.232, 0.12, {
      color: "#8A7884",
    }),
    (stepLabels = steps.map((e, t) => {
      let n = addLabel(
        e.name.toUpperCase(),
        320,
        84 + t * 70 + 22,
        0.17,
        0.11,
        {
          parent: stageGroups.AGENT,
        },
      );
      return (
        stageLabels.AGENT.push(n),
        (n.userData.off = n.material.map),
        (n.userData.on = textTexture(e.name.toUpperCase(), 96, "#141414", 600)),
        n
      );
    })),
    (needsRender = !0);
}
resize();
if (forcedQuality) setQuality(forcedQuality);
addEventListener("resize", resize);
buildLabels();
requestAnimationFrame(loop);
(() => {
  // Paged story scroll: one gesture = one beat, eased by a critically damped spring.
  // The spring starts from rest (no jolt), lands without overshoot, keeps its velocity when a new
  // gesture retargets it mid-flight, and is stepped from the render loop so the page scroll, the
  // 3D die and the copy fades all move in the same frame.
  // A wheel "gesture" is a burst of events with no gap > GAP ms; trackpad inertia stays inside the
  // same gesture, so it can never trigger a second step. A new gesture is recognised by a pause or
  // by a fresh acceleration (new swipe during inertia).
  const GAP = 140,
    OMEGA = 6.2, // spring stiffness: ~1.1s to settle a full beat
    OMEGA_SNAP = 9; // quicker settle after a scrollbar drag
  let stops = () => {
      let u = [];
      for (let d = 0; d < 9; d++) u.push(d * innerHeight);
      return u.push(document.documentElement.scrollHeight - innerHeight), u;
    },
    idx = 0,
    pos = scrollY,
    vel = 0,
    target = scrollY,
    omega = OMEGA,
    moving = !1,
    lastSet = scrollY,
    lastT = 0,
    lastAbs = 0,
    consumed = !1,
    snapT = 0,
    tickT = 0;
  const sync = (y) => {
    // innerHeight can be 0 while the page loads in a hidden/zero-size frame; dividing by it gave
    // NaN and crashed the render loop ("Cannot read properties of undefined (reading 'u')").
    (scrollState.p = innerHeight ? clamp(y / innerHeight, 0, 8) : 0),
      (scrollState.raw = innerHeight ? Math.max(0, y / innerHeight) : 0), // unclamped: lets the closing beat fade under the footer
      (needsRender = !0);
  };
  const nearestTo = (y) => {
    let u = stops(),
      m = 0;
    u.forEach((g, k) => {
      Math.abs(g - y) < Math.abs(u[m] - y) && (m = k);
    });
    return m;
  };
  scrollTick = (now) => {
    if (!moving) return;
    let dt = Math.min(1 / 30, (now - tickT) / 1000 || 1 / 60);
    tickT = now;
    // exact critically damped step: x(t) = (a + b t) e^(-wt)
    let a = pos - target,
      b = vel + omega * a,
      e = Math.exp(-omega * dt);
    pos = target + (a + b * dt) * e;
    vel = (b - omega * (a + b * dt)) * e;
    if (Math.abs(pos - target) < 0.5 && Math.abs(vel) < 8) (pos = target), (vel = 0), (moving = !1);
    scrollTo(0, pos);
    lastSet = scrollY;
    sync(pos);
  };
  function goTo(i, w = OMEGA) {
    let u = stops();
    i = clamp(i, 0, u.length - 1);
    idx = i;
    target = u[i];
    omega = w;
    if (reducedMotion) {
      (pos = target), (vel = 0), (moving = !1), scrollTo(0, pos), (lastSet = scrollY), sync(pos);
      return;
    }
    if (!moving) (pos = scrollY), (vel = 0), (tickT = performance.now());
    moving = Math.abs(pos - target) > 0.5 || Math.abs(vel) > 8;
    needsRender = !0;
  }
  // Never run more than one beat ahead of where the page actually is.
  const step = (d) => {
    let here = nearestTo(pos),
      next = idx + d;
    if (Math.abs(next - here) > 1) return;
    goTo(next);
  };
  addEventListener(
    "wheel",
    (u) => {
      if (u.ctrlKey) return; // pinch-zoom
      u.preventDefault();
      let now = performance.now(),
        a = Math.abs(u.deltaY),
        gap = now - lastT;
      let fresh = gap > GAP || (a > lastAbs * 1.8 && a > 20 && gap < GAP); // pause, or a new swipe over decaying inertia
      lastT = now;
      lastAbs = a;
      if (a < 1) return;
      if (fresh) consumed = !1;
      if (consumed) return; // still the same gesture
      consumed = !0;
      step(u.deltaY > 0 ? 1 : -1);
    },
    {
      passive: !1,
    },
  );
  let ty = null;
  addEventListener(
    "touchstart",
    (u) => {
      ty = u.touches[0].clientY;
    },
    {
      passive: !0,
    },
  );
  addEventListener(
    "touchmove",
    (u) => {
      u.cancelable && u.preventDefault();
    },
    {
      passive: !1,
    },
  );
  addEventListener(
    "touchend",
    (u) => {
      if (ty === null) return;
      let d = ty - u.changedTouches[0].clientY;
      ty = null;
      if (Math.abs(d) < 30) return;
      step(d > 0 ? 1 : -1);
    },
    {
      passive: !0,
    },
  );
  addEventListener("keydown", (u) => {
    if (u.target.closest && u.target.closest("input,textarea,select")) return;
    let down = ["ArrowDown", "PageDown", " "].includes(u.key),
      up = ["ArrowUp", "PageUp"].includes(u.key);
    if (!down && !up && u.key !== "Home" && u.key !== "End") return;
    u.preventDefault();
    if (u.key === "Home") return goTo(0, 4.5);
    if (u.key === "End") return goTo(stops().length - 1, 4.5);
    step((u.shiftKey && u.key === " ") || up ? -1 : 1);
  });

  // scrollbar drag etc: follow it, then settle on the nearest beat
  addEventListener(
    "scroll",
    () => {
      if (Math.abs(scrollY - lastSet) < 2) return; // our own scrollTo
      moving = !1;
      vel = 0;
      pos = scrollY;
      sync(scrollY);
      clearTimeout(snapT);
      snapT = setTimeout(() => {
        moving || goTo(nearestTo(scrollY), OMEGA_SNAP);
      }, 180);
    },
    {
      passive: !0,
    },
  );
  addEventListener("resize", () => {
    if (moving) return goTo(idx, omega);
    scrollTo(0, stops()[idx]), (pos = scrollY), (lastSet = scrollY), sync(scrollY);
  });
  idx = nearestTo(scrollY);
  sync(scrollY);
})();
