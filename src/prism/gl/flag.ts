/** Which renderer draws the prism. CSS 3D is the default; WebGL is an
 * experiment, opted into with `?renderer=webgl` (or `?prism=webgl`, which
 * also reveals the lure at once) and kept for the tab, so both renderers can
 * be compared on the same build. `?renderer=css` goes back. */
const KEY = "prism:renderer";

export function wantsWebgl(): boolean {
  const params = new URLSearchParams(location.search);
  const asked =
    params.get("renderer") ??
    (params.get("prism") === "webgl" ? "webgl" : null);
  try {
    if (asked === "webgl") sessionStorage.setItem(KEY, "webgl");
    else if (asked === "css") sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === "webgl";
  } catch {
    return asked === "webgl";
  }
}
