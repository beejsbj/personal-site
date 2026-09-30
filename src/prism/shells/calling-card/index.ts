/** Placeholder shell for the calling-card lens: shows the page's own content. */
import type { LensShell } from "../types";

const shell: LensShell = {
  mount({ root, route }) {
    root.replaceChildren(route.main);
    this.update = (next) => root.replaceChildren(next.main);
  },
  update() {},
};

export default shell;
