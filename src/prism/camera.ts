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
export function bodyPose(g: Geometry, { outside, turn }: Pose) {
  const drop = outside ? 0 : (0.5 - BODY_Y) * g.h;
  const depth = -g.apothem - (outside ? g.pull : 0);
  return (
    `translateY(${drop}px) translateZ(${depth}px) ` +
    `rotateX(${outside ? TILT : 0}deg) rotateY(${turn}deg)`
  );
}

/** The same camera applied to the live page as face `i`: the stage's
 * perspective, body and face transforms folded into one, about the page's
 * top-left corner. It ends in the same function list as bodyPose, so the
 * two interpolate in lockstep. */
export function pagePose(g: Geometry, pose: Pose, i: number) {
  return (
    `translate(${g.w / 2}px, ${EYE_Y * g.h}px) perspective(${g.perspective}px) ` +
    `translate(0px, ${(BODY_Y - EYE_Y) * g.h}px) ${bodyPose(g, pose)} ` +
    `rotateY(${i * TURN}deg) translateZ(${g.apothem}px) ` +
    `translate(${-g.w / 2}px, ${-g.h / 2}px)`
  );
}
