/** The signature transition: a slash of black, blood red and white bands
 * tears across the screen, a star spins up behind the destination's title
 * card, and the bands keep going to reveal the next screen. */
import { concentricStar, h, ransom } from "./dom";

export interface Wipe {
  /** Cover the screen. Resolves once it is fully covered. */
  cover(title: string): Promise<void>;
  /** Tear the cover away. */
  reveal(): Promise<void>;
  readonly covered: boolean;
}

const SHARDS: [top: number, size: number, kind: "tri" | "star" | "tri-red"][] = [
  [8, 5, "tri"],
  [22, 2.4, "star"],
  [38, 7, "tri-red"],
  [58, 3, "star"],
  [70, 6, "tri"],
  [86, 3.4, "tri-red"],
  [48, 1.8, "star"],
];

const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)";
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export function createWipe(host: HTMLElement, reducedMotion: boolean): Wipe {
  const bands = ["black", "red", "white", "black", "red"].map((tone, i) =>
    h("span", { class: `cc-wipe__band cc-wipe__band--${tone}`, style: `--i:${i}` }),
  );
  const star = h(
    "span",
    { class: "cc-wipe__star" },
    concentricStar(["#0a0a0a", "#e5191c", "#0a0a0a", "#fff", "#e5191c"]),
  );
  const title = h("span", { class: "cc-wipe__title" });
  // Shapes that fly through with the slash: shards and little stars.
  const shards = SHARDS.map(([top, size, kind], i) =>
    h("span", {
      class: `cc-wipe__shard cc-wipe__shard--${kind}`,
      style: `top:${top}%;--size:${size}rem;--i:${i}`,
    }),
  );
  const layer = h(
    "div",
    { class: "cc-wipe", "aria-hidden": "true", "data-state": "idle" },
    h("div", { class: "cc-wipe__bands" }, ...bands),
    star,
    ...shards,
    title,
  );
  host.append(layer);

  let covered = false;
  let covering: Promise<void> | undefined;

  const run = (animations: Animation[]) =>
    Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(
      () => {},
    );

  return {
    get covered() {
      return covered;
    },
    cover(text) {
      if (covering) return covering;
      title.replaceChildren(ransom(text, { boxes: 0.3, salt: 7 }));
      layer.dataset.state = "cover";
      if (reducedMotion) {
        covering = run([
          layer.animate({ opacity: [0, 1] }, { duration: 120, fill: "forwards" }),
        ]);
      } else {
        const animations = bands.map((band, i) =>
          band.animate(
            [
              { transform: `translateX(${i % 2 ? 130 : -130}%) skewX(-24deg)` },
              { transform: "translateX(0) skewX(-24deg)" },
            ],
            { duration: 300, delay: i * 36, easing: EASE_OUT, fill: "forwards" },
          ),
        );
        shards.forEach((shard, i) => {
          const spin = (i % 2 ? 1 : -1) * (240 + i * 40);
          shard.animate(
            [
              { transform: `translateX(-20vw) rotate(0deg) scale(0.6)`, opacity: 1 },
              { transform: `translateX(120vw) rotate(${spin}deg) scale(1.1)`, opacity: 1 },
            ],
            { duration: 620 + i * 40, delay: i * 30, easing: "cubic-bezier(0.3, 0.6, 0.4, 1)" },
          );
        });
        animations.push(
          star.animate(
            [
              { transform: "translate(-50%, -50%) scale(0) rotate(-140deg)" },
              { transform: "translate(-50%, -50%) scale(1) rotate(0deg)" },
            ],
            { duration: 360, delay: 120, easing: EASE_OUT, fill: "forwards" },
          ),
          title.animate(
            [
              { transform: "translate(-50%, -50%) rotate(-8deg) scale(2.4)", opacity: 0 },
              { transform: "translate(-50%, -50%) rotate(-8deg) scale(0.94)", opacity: 1, offset: 0.7 },
              { transform: "translate(-50%, -50%) rotate(-8deg) scale(1)", opacity: 1 },
            ],
            { duration: 280, delay: 170, easing: "ease-out", fill: "forwards" },
          ),
        );
        covering = run(animations);
      }
      return covering.then(() => {
        covered = true;
      });
    },
    async reveal() {
      if (covering) await covering;
      covering = undefined;
      layer.dataset.state = "reveal";
      if (reducedMotion) {
        await run([
          layer.animate({ opacity: [1, 0] }, { duration: 160, fill: "forwards" }),
        ]);
      } else {
        await run([
          ...bands.map((band, i) =>
            band.animate(
              [
                { transform: "translateX(0) skewX(-24deg)" },
                { transform: `translateX(${i % 2 ? -130 : 130}%) skewX(-24deg)` },
              ],
              {
                duration: 340,
                delay: 60 + (bands.length - i) * 30,
                easing: EASE_IN,
                fill: "forwards",
              },
            ),
          ),
          star.animate(
            [
              { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1 },
              { transform: "translate(-50%, -50%) scale(3.2) rotate(90deg)", opacity: 0 },
            ],
            { duration: 300, easing: EASE_IN, fill: "forwards" },
          ),
          title.animate(
            [
              { transform: "translate(-50%, -50%) rotate(-8deg) scale(1)", opacity: 1 },
              { transform: "translate(-20%, -50%) rotate(-8deg) scale(1.1)", opacity: 0 },
            ],
            { duration: 200, easing: EASE_IN, fill: "forwards" },
          ),
        ]);
      }
      covered = false;
      layer.dataset.state = "idle";
      for (const el of [layer, star, title, ...bands])
        el.getAnimations().forEach((a) => a.cancel());
    },
  };
}
