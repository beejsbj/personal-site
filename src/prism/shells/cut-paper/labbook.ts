import type { Update } from "../../../lib/labbook";
import type { Env } from "./bits";

export function labbook(_env: Env, _updates: Update[], _options: { whole: boolean }): HTMLElement | null {
  return null;
}

export function tendLog(_env: Env, _view: HTMLElement) {
  return () => {};
}
