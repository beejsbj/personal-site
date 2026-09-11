# BJS-427 base design studies

Three throwaway homepage iterations answer: how can the v1/v2 site's burgundy and warm paper palette, Newsreader/Lato typography, cropped circles, circular navigation, and curved lines carry the fuller BJS-42 content?

Run `corepack pnpm@10.6.5 dev --host 0.0.0.0 --port 4321` from the repository root.

- `http://localhost:4321/?variant=A`: Warm welcome, a v2-inspired large greeting and curved line, with portrait and projects.
- `http://localhost:4321/?variant=B`: Living desk, with current activity visible alongside the introduction.
- `http://localhost:4321/?variant=C`: Circular index, with v1-inspired circular navigation and work taking priority.
- `http://localhost:4321/?variant=original`: BJS-42 homepage for comparison.

The bottom switcher and left/right keyboard arrows change variants. URLs survive reload. All three consume the same project/update collections. The header and homepage composition vary; linked inner pages retain their current BJS-42 styling. The prototypes mount only during development; production builds retain the original homepage.

Primary references, explicitly selected by Burooj: `versions/v1` at `1542b6f` and `versions/v2` at `d35d2ae`. Their original browser-rendered pages were inspected through temporary snapshots, including the burgundy cropped circle, peach circular navigation, Newsreader/Lato pairing, diagonal textures, and curved line. Read `styles/default/` and `templates/modules/` at those refs for the source.

The first green/white studies used the wrong main reference. They remain recoverable at `bcf28c2`; they were not accepted. This second pass uses v1/v2 and locally bundled fonts. No design has been accepted yet. These are preserved on `prototype/bjs-427-base-iterations`; choose or combine parts before promoting a direction to production.

Issue: https://linear.app/bjs-projects/issue/BJS-427/refine-personal-site-base-design-from-original-styling
