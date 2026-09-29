import { DEFAULT_LENS, isLens } from "./lenses";

/** Lens persistence. The pre-paint copy of this logic lives inline in
 * LensBoot.astro; keep the two in step. */
export const LENS_KEY = "prism:lens";
export const FACE_PARAM = "prism-face";

export function isFace() {
  return document.documentElement.hasAttribute("data-prism-face");
}

export function currentLens() {
  const lens = document.documentElement.dataset.lens;
  return isLens(lens) ? lens : DEFAULT_LENS;
}

export function setLens(id: string) {
  if (!isLens(id)) return;
  document.documentElement.dataset.lens = id;
  if (isFace()) return;
  try {
    localStorage.setItem(LENS_KEY, id);
  } catch {}
}
