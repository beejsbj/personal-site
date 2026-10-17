/** The prism's camera, as CSS transforms. Pure: the stage (stage.ts) and the
 * live page (live-page.ts) both take their pose from here, so the page you
 * came from and the prism's other faces move as one body. */

/** Faces round the prism. */
export const SIDES = 5;
export const TURN = 360 / SIDES;
/** Where the prism hangs in the room, as fractions of the viewport height:
 * the body's centre and the eye (perspective origin). The stage is given
 * these as --body-y and --eye-y. */
export const BODY_Y = 0.42;
export const EYE_Y = 0.36;
/** How far the camera tips to look down on the prism from outside. */
export const TILT = -11;

export interface Geometry {
  w: number;
  h: number;
  apothem: number;
  radius: number;
  perspective: number;
  pull: number;
}

export function geometry(w: number, h: number): Geometry {
  const apothem = w / (2 * Math.tan(Math.PI / SIDES));
  const radius = w / (2 * Math.sin(Math.PI / SIDES));
  const perspective = Math.max(w, h) * 1.15;
  const outsideScale = w < 700 ? 0.5 : 0.34;
  const pull = perspective * (1 / outsideScale - 1);
  return { w, h, apothem, radius, perspective, pull };
}

export interface Pose {
  outside: boolean;
  /** The prism's turn, in degrees; face i is in front at -i × TURN. */
  turn: number;
}

/** The camera, as a transform of the prism's body. Inside, the front face
 * sits exactly on the viewport (the body hangs at BODY_Y, so it is lifted
 * back down); outside, the prism hangs where it is composed. */
export function bodyPose(g: Geometry, pose: Pose) {
  return bodyTransform(params(g, pose));
}

/** bodyPose, from the camera's numbers (see `between`). */
export function bodyTransform({ drop, depth, tilt, turn }: Params) {
  return (
    `translateY(${drop}px) translateZ(${depth}px) ` +
    `rotateX(${tilt}deg) rotateY(${turn}deg)`
  );
}

/** The same camera applied to the live page as face `i`: the stage's
 * perspective, body and face transforms folded into one, about the page's
 * top-left corner. It ends in the same function list as bodyPose, so the
 * two interpolate in lockstep. */
export function pagePose(g: Geometry, pose: Pose, i: number) {
  return pageTransform(g, params(g, pose), i);
}

/** pagePose, from the camera's numbers. Also what the WebGL renderer
 * (gl/renderer.ts) projects each face with, so both renderers share one
 * camera. */
export function pageTransform(g: Geometry, p: Params, i: number) {
  return (
    `${eyeTransform(g)} ${bodyTransform(p)} ` +
    `rotateY(${i * TURN}deg) translateZ(${g.apothem}px) ` +
    `translate(${-g.w / 2}px, ${-g.h / 2}px)`
  );
}

/** From the viewport's top-left corner to the body's centre, through the
 * stage's perspective. */
export function eyeTransform(g: Geometry) {
  return (
    `translate(${g.w / 2}px, ${EYE_Y * g.h}px) perspective(${g.perspective}px) ` +
    `translate(0px, ${(BODY_Y - EYE_Y) * g.h}px)`
  );
}

/** A pose as the numbers the camera's transform interpolates, linearly in
 * an animation's progress (the function list never changes). */
export function params(g: Geometry, { outside, turn }: Pose) {
  return {
    drop: outside ? 0 : (0.5 - BODY_Y) * g.h,
    depth: -g.apothem - (outside ? g.pull : 0),
    tilt: outside ? TILT : 0,
    turn,
  };
}
export type Params = ReturnType<typeof params>;

/** The camera `t` of the way from one pose to another (t already eased):
 * what a CSS animation between bodyPose(from) and bodyPose(to) shows at
 * that progress, since its function lists match. */
export function between(g: Geometry, from: Pose, to: Pose, t: number): Params {
  const a = params(g, from);
  const b = params(g, to);
  return {
    drop: a.drop + (b.drop - a.drop) * t,
    depth: a.depth + (b.depth - a.depth) * t,
    tilt: a.tilt + (b.tilt - a.tilt) * t,
    turn: a.turn + (b.turn - a.turn) * t,
  };
}

/** Does face `i` show its front to the eye? It does when the eye is on the
 * front side of its plane. Worked in the eye's frame (origin at the
 * perspective origin, the eye `perspective` px in front of the screen),
 * from the same transforms as pagePose; cheap enough to run hundreds of
 * times at the start of every turn. */
function faces(g: Geometry, p: Params, i: number) {
  const rx = (p.tilt * Math.PI) / 180;
  const ry = ((p.turn + i * TURN) * Math.PI) / 180;
  const sx = Math.sin(rx);
  const cx = Math.cos(rx);
  const sy = Math.sin(ry);
  const cy = Math.cos(ry);
  // the face's normal: rotateX(tilt) · rotateY(turn + i·TURN) · (0, 0, 1)
  const nx = sy;
  const ny = -sx * cy;
  const nz = cx * cy;
  // from its centre (the body's offset, then that rotation of (0, 0,
  // apothem)) to the eye, (0, 0, perspective)
  const dx = -g.apothem * nx;
  const dy = -((BODY_Y - EYE_Y) * g.h + p.drop + g.apothem * ny);
  const dz = g.perspective - (p.depth + g.apothem * nz);
  return nx * dx + ny * dy + nz * dz > 0;
}

/** Whether face `i` shows its front to the eye, from the camera's numbers. */
export function facingAt(g: Geometry, p: Params, i: number) {
  return faces(g, p, i);
}

/** Whether face `i` shows its front to the eye in this pose. */
export function facing(g: Geometry, pose: Pose, i: number) {
  return faces(g, params(g, pose), i);
}

/** How face `i` turns toward and away from the eye over a move from one pose
 * to another, as the progress points where that flips. Each flip is placed
 * on the side of the turn where the face is away (so a face is never shown
 * from behind at full strength, even for a frame), and lands while it is
 * edge-on, where the switch can't be seen. */
export function facingTrack(
  g: Geometry,
  from: Pose,
  to: Pose,
  i: number,
  steps = 240,
) {
  const a = params(g, from);
  const b = params(g, to);
  const at = (t: number): Params => ({
    drop: a.drop + (b.drop - a.drop) * t,
    depth: a.depth + (b.depth - a.depth) * t,
    tilt: a.tilt + (b.tilt - a.tilt) * t,
    turn: a.turn + (b.turn - a.turn) * t,
  });
  const track = [{ offset: 0, toward: faces(g, a, i) }];
  let last = track[0].toward;
  for (let k = 1; k <= steps; k += 1) {
    const now = faces(g, at(k / steps), i);
    if (now === last) continue;
    // turning toward: switch at the first sample that faces; turning away:
    // switch at the last sample that still faced
    track.push({ offset: (now ? k : k - 1) / steps, toward: now });
    last = now;
  }
  return track;
}
