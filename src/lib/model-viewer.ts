/** The viewer a model block loads when it is asked for, and never before
 * (./block-stage): a chunk of its own. three.js shows a .glb; a Gaussian
 * splat (.spz, .sog, .splat) is drawn by Spark, on three.js, which is
 * fetched only for one. Both ship with the site: nothing is asked of
 * another site but the model itself, when that is where it is kept.
 *
 * The model is turned by dragging, zoomed by the wheel or a pinch, and
 * from the keyboard by the arrow keys and + and -. It never moves by
 * itself. */
import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Sphere,
  Spherical,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface ModelOptions {
  src: string;
  /** "glb", "spz", "sog" or "splat" (`modelFormat` in ./blocks). */
  format: string;
  /** Degrees about x, y and z, to stand the model upright. */
  rotation?: number[];
  reducedMotion: boolean;
}

/** One press of an arrow key turns the model this far; + and - move this
 * much nearer or further. */
const TURN = Math.PI / 24;
const ZOOM = 0.85;

/** Show the model on `canvas`. Resolves, once it is showing, to what puts
 * it away; rejects when it cannot be shown (no WebGL, no such file). */
export async function showModel(
  canvas: HTMLCanvasElement,
  { src, format, rotation = [], reducedMotion }: ModelOptions,
): Promise<() => void> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  const holder = new Group();
  const [x = 0, y = 0, z = 0] = rotation.map(MathUtils.degToRad);
  holder.rotation.set(x, y, z);
  scene.add(holder);
  let release = () => {};

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const sized = new ResizeObserver(resize);

  /** Turn about the model, or move nearer or further, from the keyboard. */
  const onKey = (event: KeyboardEvent) => {
    const offset = camera.position.clone().sub(controls.target);
    const around = new Spherical().setFromVector3(offset);
    switch (event.key) {
      case "ArrowLeft":
        around.theta -= TURN;
        break;
      case "ArrowRight":
        around.theta += TURN;
        break;
      case "ArrowUp":
        around.phi -= TURN;
        break;
      case "ArrowDown":
        around.phi += TURN;
        break;
      case "+":
      case "=":
        around.radius *= ZOOM;
        break;
      case "-":
        around.radius /= ZOOM;
        break;
      default:
        return;
    }
    event.preventDefault();
    around.makeSafe();
    camera.position.copy(controls.target).add(offset.setFromSpherical(around));
    camera.lookAt(controls.target);
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    sized.disconnect();
    canvas.removeEventListener("keydown", onKey);
    controls.dispose();
    release();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  try {
    const bounds = new Box3();
    if (format === "glb") {
      const { GLTFLoader } = await import(
        "three/addons/loaders/GLTFLoader.js"
      );
      const { scene: model } = await new GLTFLoader().loadAsync(src);
      holder.add(model);
      const sun = new DirectionalLight(0xffffff, 2);
      sun.position.set(2, 4, 3);
      scene.add(new HemisphereLight(0xffffff, 0x444444, 2), sun);
      bounds.setFromObject(holder);
    } else {
      const { SparkRenderer, SplatMesh, SplatFileType } = await import(
        "@sparkjsdev/spark"
      );
      const fileType = {
        spz: SplatFileType.SPZ,
        sog: SplatFileType.PCSOGSZIP,
        splat: SplatFileType.SPLAT,
      }[format];
      if (!fileType) throw new Error(`No viewer shows a .${format} file.`);
      scene.add(new SparkRenderer({ renderer }));
      const splat = new SplatMesh({ url: src, fileType });
      release = () => splat.dispose();
      holder.add(splat);
      await splat.initialized;
      holder.updateMatrixWorld(true);
      bounds.copy(splat.getBoundingBox()).applyMatrix4(splat.matrixWorld);
    }

    // Stand back far enough to see all of it, a little above and aside.
    const { center, radius } = bounds.getBoundingSphere(new Sphere());
    const distance = (radius || 1) / Math.sin(MathUtils.degToRad(45 / 2));
    controls.target.copy(center);
    camera.position
      .copy(center)
      .add(new Vector3(0.5, 0.35, 1).normalize().multiplyScalar(distance));
    camera.near = distance / 100;
    camera.far = distance * 100;

    resize();
    sized.observe(canvas);
    canvas.addEventListener("keydown", onKey);
    renderer.setAnimationLoop(() => {
      // The page it stood on is gone: stop with it.
      if (!canvas.isConnected) return dispose();
      controls.update();
      renderer.render(scene, camera);
    });
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
