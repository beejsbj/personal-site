/** The prism's camera (src/prism/camera.ts): the live page you came from is
 * carried as its own face by a transform folded from the stage's CSS, so it
 * must land exactly where the stage puts that face, and, inside, exactly on
 * the viewport. If it doesn't, pulling out jumps instead of shrinking. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const compiled = ts.transpileModule(read("../../src/prism/camera.ts"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const camera = (() => {
  const context = { exports: {} };
  vm.runInNewContext(compiled, context);
  return context.exports;
})();

// 4×4 matrices for CSS transform functions (column vectors, M·p).
const I = () => [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];
const mul = (a, b) =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)),
  );
const T = (x = 0, y = 0, z = 0) => {
  const m = I();
  m[0][3] = x;
  m[1][3] = y;
  m[2][3] = z;
  return m;
};
const rad = (deg) => (deg * Math.PI) / 180;
const RX = (deg) => {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1],
  ];
};
const RY = (deg) => {
  const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
  return [
    [c, 0, s, 0],
    [0, 1, 0, 0],
    [-s, 0, c, 0],
    [0, 0, 0, 1],
  ];
};
const P = (d) => {
  const m = I();
  m[3][2] = -1 / d;
  return m;
};
/** A CSS transform list, as the browser would compose it. */
function parse(css) {
  let m = I();
  for (const [, name, args] of css.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = args.split(",").map((v) => parseFloat(v));
    const f = {
      translate: () => T(n[0], n[1] ?? 0),
      translateY: () => T(0, n[0]),
      translateZ: () => T(0, 0, n[0]),
      rotateX: () => RX(n[0]),
      rotateY: () => RY(n[0]),
      perspective: () => P(n[0]),
    }[name];
    assert.ok(f, `unknown transform function ${name}`);
    m = mul(m, f());
  }
  return m;
}
const project = (m, [x, y]) => {
  const [X, Y, , W] = m.map((row) => row[0] * x + row[1] * y + row[3]);
  return [X / W, Y / W];
};

/** Where the stage's CSS puts face `i` (stage.css: the camera's perspective
 * about --eye-y; the body centred at --body-y, turned about its centre; each
 * face turned about its own centre). Built independently of pagePose. */
function stageFace(g, pose, i) {
  const { BODY_Y, EYE_Y, TURN } = camera;
  const centre = T(g.w / 2, g.h / 2);
  const back = T(-g.w / 2, -g.h / 2);
  const eye = mul(
    mul(T(g.w / 2, EYE_Y * g.h), P(g.perspective)),
    T(-g.w / 2, -EYE_Y * g.h),
  );
  const body = [
    T(0, BODY_Y * g.h - g.h / 2),
    centre,
    parse(camera.bodyPose(g, pose)),
    back,
  ].reduce(mul);
  const face = [centre, RY(i * TURN), T(0, 0, g.apothem), back].reduce(mul);
  return [eye, body, face].reduce(mul);
}

const SIZES = [
  [1280, 800],
  [390, 844],
  [1024, 1366],
];

test("the camera has a face for every lens", () => {
  const lenses = read("../../src/prism/lenses.ts").match(/^\s+id: "/gm).length;
  assert.equal(camera.SIDES, lenses);
});

test("inside, the front face is the viewport: the page starts and ends exactly where it is", () => {
  for (const [w, h] of SIZES) {
    const g = camera.geometry(w, h);
    for (let i = 0; i < camera.SIDES; i += 1)
      for (const laps of [0, -1, 2]) {
        const pose = { outside: false, turn: -i * camera.TURN + laps * 360 };
        const stage = stageFace(g, pose, i);
        const page = parse(camera.pagePose(g, pose, i));
        for (const corner of [
          [0, 0],
          [w, 0],
          [0, h],
          [w, h],
        ]) {
          for (const m of [stage, page]) {
            const [x, y] = project(m, corner);
            assert.ok(
              Math.abs(x - corner[0]) < 1e-6 && Math.abs(y - corner[1]) < 1e-6,
              `${w}×${h} face ${i}: corner ${corner} lands at ${x},${y}`,
            );
          }
        }
      }
  }
});

test("the live page rides exactly where the stage draws its face, in every pose", () => {
  for (const [w, h] of SIZES) {
    const g = camera.geometry(w, h);
    for (let i = 0; i < camera.SIDES; i += 1)
      for (const outside of [true, false])
        for (const turn of [
          -i * camera.TURN,
          -i * camera.TURN - 72,
          40,
          -500,
        ]) {
          const pose = { outside, turn };
          const stage = stageFace(g, pose, i);
          const page = parse(camera.pagePose(g, pose, i));
          for (const point of [
            [0, 0],
            [w, 0],
            [0, h],
            [w, h],
            [w / 3, h / 5],
          ]) {
            const a = project(stage, point);
            const b = project(page, point);
            assert.ok(
              Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6,
              `${w}×${h} face ${i} ${JSON.stringify(pose)}: ${a} vs ${b}`,
            );
          }
        }
  }
});

test("the page's pose ends in the camera's own function list, so they move in lockstep", () => {
  const g = camera.geometry(1280, 800);
  const names = (css) => [...css.matchAll(/(\w+)\(/g)].map((m) => m[1]);
  const poses = [
    { outside: false, turn: 0 },
    { outside: true, turn: -144 },
  ];
  const lists = poses.map((pose) => names(camera.pagePose(g, pose, 2)));
  assert.deepEqual(lists[0], lists[1], "the same list in every pose");
  const body = names(camera.bodyPose(g, poses[0]));
  assert.deepEqual(lists[0].slice(3, 3 + body.length), body);
});

test("the stage CSS hangs the prism where the camera says", () => {
  const css = read("../../src/prism/stage.css");
  assert.match(css, /perspective-origin: 50% var\(--eye-y/);
  assert.match(css, /top: var\(--body-y/);
  const stage = read("../../src/prism/stage.ts");
  assert.match(stage, /--body-y", `\$\{BODY_Y \* 100\}%`/);
  assert.match(stage, /--eye-y", `\$\{EYE_Y \* 100\}%`/);
});
