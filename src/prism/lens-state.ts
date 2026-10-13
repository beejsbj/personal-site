import { DEFAULT_LENS, isLens } from "./lenses";
import { hasShell, syncShell } from "./shell-runtime";

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

/** Adopt a lens. Resolves once its shell (if any) has painted. */
export function setLens(id: string): Promise<void> {
  if (!isLens(id)) return Promise.resolve();
  const root = document.documentElement;
  root.dataset.lens = id;
  root.toggleAttribute("data-lens-shell", hasShell(id));
  if (!isFace()) {
    try {
      localStorage.setItem(LENS_KEY, id);
    } catch {}
  }
  return syncShell();
}
