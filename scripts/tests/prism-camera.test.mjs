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

/** The reference: a face shows its front when its corners, projected as the
 * stage projects them, wind clockwise on screen (what the browser culls). */
function windsFront(g, pose, i) {
  const m = stageFace(g, pose, i);
  const [a, b, c] = [
    [0, 0],
    [g.w, 0],
    [g.w, g.h],
  ].map((point) => project(m, point));
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
}

test("a face is known to face the eye exactly when the browser would draw its front", () => {
  for (const [w, h] of SIZES) {
    const g = camera.geometry(w, h);
    for (const outside of [true, false])
      for (let turn = -400; turn <= 400; turn += 7)
        for (let i = 0; i < camera.SIDES; i += 1)
          assert.equal(
            camera.facing(g, { outside, turn }, i),
            windsFront(g, { outside, turn }, i),
            `${w}×${h} face ${i} ${JSON.stringify({ outside, turn })}`,
          );
  }
});

/** Turns, pulls and steps the stage really makes. */
const MOVES = [
  [
    { outside: true, turn: 0 },
    { outside: true, turn: -72 },
  ],
  [
    { outside: true, turn: -72 },
    { outside: true, turn: 0 },
  ],
  [
    { outside: true, turn: -144 },
    { outside: true, turn: 0 },
  ],
  [
    { outside: false, turn: 0 },
    { outside: true, turn: 0 },
  ],
  [
    { outside: true, turn: -216 },
    { outside: false, turn: -144 },
  ],
];

test("turning, a face is shaded in only once it faces the eye, and out before it turns away", () => {
  for (const [w, h] of SIZES) {
    const g = camera.geometry(w, h);
    for (const [from, to] of MOVES)
      for (let i = 0; i < camera.SIDES; i += 1) {
        const track = camera.facingTrack(g, from, to, i);
        assert.equal(track[0].offset, 0);
        const shown = (t) =>
          track.filter((step) => step.offset <= t).at(-1).toward;
        for (let k = 0; k <= 1000; k += 1) {
          const t = k / 1000;
          const pose = {
            outside: from.outside,
            turn: from.turn + (to.turn - from.turn) * t,
          };
          // the camera's numbers move linearly in progress; outside/inside
          // differs only at the ends of a pull, where facing is checked below
          if (from.outside !== to.outside) continue;
          if (shown(t))
            assert.ok(
              windsFront(g, pose, i),
              `${w}×${h} face ${i} shown from behind at ${t} of ${JSON.stringify([from, to])}`,
            );
        }
        assert.equal(track[0].toward, camera.facing(g, from, i));
        assert.equal(track.at(-1).toward, camera.facing(g, to, i));
      }
  }
});

/** Two transform strings with the same functions and numbers equal to
 * within floating-point noise. */
function sameTransform(a, b) {
  const nums = (s) => s.match(/-?[\d.]+(e-?\d+)?/g).map(Number);
  assert.equal(
    a.replace(/-?[\d.]+(e-?\d+)?/g, "#"),
    b.replace(/-?[\d.]+(e-?\d+)?/g, "#"),
  );
  nums(a).forEach((n, k) =>
    assert.ok(Math.abs(n - nums(b)[k]) < 1e-9, `${a} vs ${b}`),
  );
}

test("the WebGL renderer's camera (between, pageTransform) is the CSS camera", () => {
  for (const [w, h] of SIZES) {
    const g = camera.geometry(w, h);
    for (const [from, to] of MOVES) {
      sameTransform(
        camera.bodyTransform(camera.between(g, from, to, 0)),
        camera.bodyPose(g, from),
      );
      sameTransform(
        camera.bodyTransform(camera.between(g, from, to, 1)),
        camera.bodyPose(g, to),
      );
      for (let i = 0; i < camera.SIDES; i += 1)
        assert.equal(
          camera.pageTransform(g, camera.params(g, to), i),
          camera.pagePose(g, to, i),
        );
    }
  }
});
