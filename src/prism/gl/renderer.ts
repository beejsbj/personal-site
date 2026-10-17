/** The prism drawn with WebGL (experiment, `?renderer=webgl`).
 *
 * One canvas over the room, under the HUD: the faces other than the live
 * page are textured quads, projected with exactly the transforms the CSS
 * stage uses (camera.ts: pageTransform, parsed by DOMMatrix), so a WebGL
 * face lands where its CSS face would, to the pixel, and meets the live
 * page (still real DOM, carried by CSS) edge to edge. Textures are
 * mipmapped, so a face shrunk onto the prism is filtered rather than
 * sampled every few pixels (the shimmer a minified CSS layer can show).
 *
 * Raw WebGL2, no library: five quads and two pentagons. */
import {
  SIDES,
  eyeTransform,
  bodyTransform,
  facingAt,
  pageTransform,
  type Geometry,
  type Params,
} from "../camera";

const FACE_VS = `#version 300 es
uniform mat4 uM;
uniform vec2 uSize;     // face size, CSS px
uniform vec2 uView;     // viewport, CSS px
in vec2 aUV;
out vec2 vUV;
void main() {
  vUV = aUV;
  vec4 p = uM * vec4(aUV * uSize, 0.0, 1.0);
  // CSS px (y down, homogeneous) to clip space; w kept for perspective-
  // correct texturing.
  gl_Position = vec4(2.0 * p.x / uView.x - p.w, p.w - 2.0 * p.y / uView.y, 0.0, p.w);
}`;

/* Mirrors stage.css: the face's paper (#111 until its texture arrives), then
 * ::before (sheen at 100deg and a 2px inset edge, shown outside) and ::after
 * (the dimming of a face that isn't in front). */
const FACE_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uHasTex;
uniform vec2 uSize;
uniform float uOut;
uniform float uDim;
in vec2 vUV;
out vec4 o;
void main() {
  vec3 c = uHasTex > 0.5 ? texture(uTex, vUV).rgb : vec3(17.0 / 255.0);
  vec2 px = vUV * uSize;
  float a = radians(100.0);
  vec2 dir = vec2(sin(a), -cos(a));
  float len = abs(uSize.x * sin(a)) + abs(uSize.y * cos(a));
  float t = dot(px - uSize * 0.5, dir) / len + 0.5;
  float sheen = t < 0.22 ? mix(0.16, 0.0, t / 0.22)
              : t > 0.7 ? mix(0.0, 0.1, (t - 0.7) / 0.3) : 0.0;
  float edge = min(min(px.x, uSize.x - px.x), min(px.y, uSize.y - px.y));
  // the inset box-shadow is drawn over the gradient
  float before = edge < 2.0 ? 0.55 + sheen * 0.45 : sheen;
  c = mix(c, vec3(1.0), before * uOut);
  c = mix(c, vec3(4.0, 4.0, 10.0) / 255.0, 0.5 * uDim);
  o = vec4(c, 1.0);
}`;

const CAP_VS = `#version 300 es
uniform mat4 uM;
uniform float uSide;
uniform vec2 uView;
in vec2 aUV;
out vec2 vUV;
void main() {
  vUV = aUV;
  vec4 p = uM * vec4(aUV * uSide, 0.0, 1.0);
  gl_Position = vec4(2.0 * p.x / uView.x - p.w, p.w - 2.0 * p.y / uView.y, 0.0, p.w);
}`;

/* .prism-cap: a radial glow (white 0.2 at 50% 60%, gone by 70%) over glass
 * (white 0.07), premultiplied. */
const CAP_FS = `#version 300 es
precision highp float;
uniform float uAlpha;
in vec2 vUV;
out vec4 o;
void main() {
  // farthest-corner radius from (0.5, 0.6) of a square box
  float r = length(vec2(0.5, 0.6));
  float glow = 0.2 * (1.0 - clamp(length(vUV - vec2(0.5, 0.6)) / (0.7 * r), 0.0, 1.0));
  float a = glow + 0.07 * (1.0 - glow);
  o = vec4(vec3(a), a) * uAlpha;
}`;

/** The cap's clip-path in stage.ts (CAP_TOP), as fractions of its box. */
const PENTAGON = [
  [0.5, 0],
  [0.9755, 0.3455],
  [0.7939, 0.9045],
  [0.2061, 0.9045],
  [0.0245, 0.3455],
];

/** CSS `ease`, the stage's 0.8s fades. */
function ease(t: number) {
  return cubicBezier(0.25, 0.1, 0.25, 1)(t);
}

/** A CSS cubic-bezier timing function. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bez = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let k = 0; k < 30; k += 1) {
      const v = bez(x1, x2, t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return bez(y1, y2, t);
  };
}

/** A value that eases to its target over 0.8s, like the stage's transitions. */
class Fade {
  private from: number;
  private to: number;
  private start = 0;
  constructor(value: number) {
    this.from = this.to = value;
  }
  set(to: number, now: number) {
    if (to === this.to) return;
    this.from = this.at(now);
    this.to = to;
    this.start = now;
  }
  at(now: number) {
    const t = Math.min(1, (now - this.start) / 800);
    return this.from + (this.to - this.from) * ease(t);
  }
  done(now: number) {
    return now - this.start >= 800;
  }
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
    return shader;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, make(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(prog, 0, "aUV");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  return {
    prog,
    u: (name: string) => {
      if (!uniforms.has(name))
        uniforms.set(name, gl.getUniformLocation(prog, name));
      return uniforms.get(name)!;
    },
  };
}

const matrix = (css: string) => new DOMMatrix(css);

export interface GlPrism {
  readonly canvas: HTMLCanvasElement;
  /** False once the context is lost: the stage goes back to CSS. */
  readonly ok: boolean;
  /** Give face `i` its picture (a snapshot of its lens). */
  setTexture(i: number, source: TexImageSource): void;
  hasTexture(i: number): boolean;
  /** What the stage's attributes would say: outside, and which face is in
   * front (starts the same 0.8s fades as the CSS). */
  setState(outside: boolean, front: number): void;
  /** Draw the prism with the camera here. */
  draw(g: Geometry, p: Params): void;
  /** Size the canvas to the viewport. */
  resize(g: Geometry): void;
  destroy(): void;
}

/** null when WebGL2 isn't there (the stage then stays CSS). */
export function createGlPrism(
  /** The live page's face: drawn by the DOM, never here. */
  live: number,
  onLost: () => void,
): GlPrism | null {
  const canvas = document.createElement("canvas");
  canvas.className = "prism-gl";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;
  if (typeof DOMMatrix === "undefined") return null;
  let ok = true;
  let raf = 0;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    ok = false;
    cancelAnimationFrame(raf);
    onLost();
  });

  let face: ReturnType<typeof program>;
  let cap: ReturnType<typeof program>;
  try {
    face = program(gl, FACE_VS, FACE_FS);
    cap = program(gl, CAP_VS, CAP_FS);
  } catch (error) {
    console.warn("[prism:webgl]", error);
    return null;
  }
  const aniso =
    gl.getExtension("EXT_texture_filter_anisotropic") ??
    gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const pent = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pent);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(PENTAGON.flat()),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);

  const textures: (WebGLTexture | null)[] = Array(SIDES).fill(null);
  const out = new Fade(0);
  const caps = new Fade(0);
  const dims = Array.from({ length: SIDES }, () => new Fade(0));
  let last: { g: Geometry; p: Params } | null = null;

  const fading = (now: number) =>
    !out.done(now) || !caps.done(now) || dims.some((d) => !d.done(now));

  function paint() {
    if (!last || !ok) return;
    const { g, p } = last;
    const now = performance.now();
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.disable(gl!.BLEND);

    gl!.useProgram(face.prog);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quad);
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
    gl!.uniform2f(face.u("uSize"), g.w, g.h);
    gl!.uniform2f(face.u("uView"), g.w, g.h);
    gl!.uniform1f(face.u("uOut"), out.at(now));
    gl!.uniform1i(face.u("uTex"), 0);
    for (let i = 0; i < SIDES; i += 1) {
      // the live page is its own face; a face turned away isn't drawn
      // (the CSS shades those out too)
      if (i === live || !facingAt(g, p, i)) continue;
      gl!.uniformMatrix4fv(
        face.u("uM"),
        false,
        matrix(pageTransform(g, p, i)).toFloat32Array(),
      );
      gl!.uniform1f(face.u("uDim"), dims[i].at(now));
      gl!.uniform1f(face.u("uHasTex"), textures[i] ? 1 : 0);
      gl!.bindTexture(gl!.TEXTURE_2D, textures[i]);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }

    const capAlpha = caps.at(now);
    if (capAlpha > 0) {
      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
      gl!.useProgram(cap.prog);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, pent);
      gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform2f(cap.u("uView"), g.w, g.h);
      gl!.uniform1f(cap.u("uSide"), g.radius * 2);
      gl!.uniform1f(cap.u("uAlpha"), capAlpha);
      const body = `${eyeTransform(g)} ${bodyTransform(p)}`;
      const r = g.radius;
      for (const css of [
        `${body} rotateX(90deg) translateZ(${g.h / 2}px) translate(${-r}px, ${-r}px)`,
        `${body} rotateX(-90deg) translateZ(${g.h / 2}px) scaleY(-1) translate(${-r}px, ${-r}px)`,
      ]) {
        const m = matrix(css);
        if (!frontFacing(m, r * 2)) continue;
        gl!.uniformMatrix4fv(cap.u("uM"), false, m.toFloat32Array());
        gl!.drawArrays(gl!.TRIANGLE_FAN, 0, PENTAGON.length);
      }
    }
    if (fading(now)) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    }
  }

  return {
    canvas,
    get ok() {
      return ok;
    },
    setTexture(i, source) {
      if (!ok) return;
      const tex = textures[i] ?? gl.createTexture();
      textures[i] = tex;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso)
        gl.texParameterf(
          gl.TEXTURE_2D,
          aniso.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
        );
      paint();
    },
    hasTexture: (i) => !!textures[i],
    setState(outside, front) {
      const now = performance.now();
      out.set(outside ? 1 : 0, now);
      caps.set(outside ? 1 : 0, now);
      dims.forEach((d, i) => d.set(outside && i !== front ? 1 : 0, now));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    },
    draw(g, p) {
      last = { g, p };
      cancelAnimationFrame(raf);
      paint();
    },
    resize(g) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(g.w * dpr);
      canvas.height = Math.round(g.h * dpr);
      if (last) last = { g, p: last.p };
    },
    destroy() {
      cancelAnimationFrame(raf);
      textures.forEach((tex) => tex && gl.deleteTexture(tex));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}

/** Does a pentagon drawn with this matrix show its front? (Its points wind
 * clockwise on screen, as they do in its own box, y down.) */
function frontFacing(m: DOMMatrix, side: number) {
  const pts = PENTAGON.map(([u, v]) => {
    const q = m.transformPoint(new DOMPoint(u * side, v * side, 0, 1));
    return [q.x / q.w, q.y / q.w, q.w];
  });
  if (pts.some(([, , w]) => w <= 0)) return false;
  let area = 0;
  for (let k = 0; k < pts.length; k += 1) {
    const [x1, y1] = pts[k];
    const [x2, y2] = pts[(k + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return area > 0;
}
