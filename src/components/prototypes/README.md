# BJS-427 base design studies

Three throwaway homepage iterations answer: how can the original site's bold sans-serif type, white space, green links, direct greeting, and brace motif carry the fuller BJS-42 content?

Run `corepack pnpm@10.6.5 dev --host 0.0.0.0 --port 4321` from the repository root.

- `http://localhost:4321/?variant=A`: Open home, closest to the original spacious introduction.
- `http://localhost:4321/?variant=B`: Personal desk, with current activity visible alongside the introduction.
- `http://localhost:4321/?variant=C`: Project index, with identity/navigation at left and work taking priority.
- `http://localhost:4321/?variant=original`: BJS-42 homepage for comparison.

The bottom switcher and left/right keyboard arrows change variants. URLs survive reload. All three consume the same project/update collections. The header and homepage composition vary; linked inner pages retain their current BJS-42 styling. The prototypes mount only during development; production builds retain the original homepage.

Reference: original rendered `https://burooj.dev/`, the PHP templates and styles retained in this repo, and Burooj's explicit direction to reuse and improve his old base styling. Green is darkened for readability on white. No design has been accepted yet. These are preserved on `prototype/bjs-427-base-iterations`; choose or combine parts before promoting a direction to production.

Issue: https://linear.app/bjs-projects/issue/BJS-427/refine-personal-site-base-design-from-original-styling
