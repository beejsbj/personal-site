# One portfolio, several visual faces

Assessment: 20 September 2026, from the current Astro source and the Design Lab
workflow. This is a proposed prism foundation, not a shipped theme switcher or
approval of the six visual directions.

## What is flexible today

| Boundary            | Current evidence                                                                                       | Limit                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Content             | Typed collections in `src/content.config.ts`; projects, pages, lab and updates live in `src/content/`  | Some visible copy is still authored inside `WelcomeHero`, `Homepage` and page templates.                       |
| Visual grammar      | `src/design/tokens.css` owns semantic colors, type, spacing and geometry; components consume variables | Tokens are global `:root` values. The document's `data-theme="default"` is a label, not a selection mechanism. |
| Component contracts | Heading level is separate from scale; links keep native behavior; project rows have explicit layouts   | Default anatomy and responsive arrangements still live directly in components and global layout rules.         |
| Shared surfaces     | `BaseLayout` owns metadata/chrome; pages reuse the same assemblies                                     | Default specimens and motion are selected directly, without a theme manifest.                                  |
| Demonstration       | `/style-guide` imports production sources                                                              | The guide demonstrates one visual system. There is no cross-theme content/state parity check.                  |

The default is a coherent single-theme system and a useful starting point. It is
not yet a complete architecture for interchangeable prism faces. Recoloring it
would be straightforward; substantially changing typography, arrangement, art and
motion needs an explicit presentation boundary.

## Apply Design Lab to each face

Keep tokens → primitives → compounds → compositions as the reusable ladder.
Portraits, the recovered circle transition, playful circles and the eventual prism
remain unique specimens outside that ladder. They may consume shared grammar
without becoming forced variants of a generic component.

Keep product source and evidence here. The cross-project Design Lab owns practice
and navigation; it should not become this site's runtime dependency. Reuse
`docs/base-design.md` for current design decisions and `/style-guide` for the
final guide. Use a temporary, isolated workbench when comparing a new face, then
make the guide import the resulting authoritative source.

Track definition, source ownership, demonstration, production adoption and taste
acceptance separately. A face is not accepted because its screenshot or tests
exist. The existing default remains the accepted visual starting point.

## Smallest useful next implementation

1. Finish the content contract. Move reusable visible copy out of presentation
   components into typed content. Keep stable identifiers, URLs, headings,
   evidence, project selection and activity ordering independent of appearance.
2. Extract a default-theme manifest that names its tokens, compositions, unique
   specimens and motion policy. Keep routes, metadata, navigation semantics and
   content fetching outside that manifest. Select a face at the layout boundary,
   with `default` as the no-script and unknown-value fallback.
3. Prove that contract with one deliberately different second face before
   building the remaining four. Start with the preserved PE reference: it is
   available source evidence, not an assumption that its whole design is already
   approved. Use token changes for shared anatomy and explicit composition
   variants where arrangement truly differs. Do not scatter theme conditionals
   through every component or force six designs into a single rigid DOM shape.
4. Check both faces with the same real content: Home, project listing/detail,
   long titles, empty updates, compact/wide viewports, keyboard, reduced motion
   and no-script navigation. Switching must retain the route and useful user
   state. Both faces must expose the same content and destinations.
5. Add prism reveal/camera movement around this proven boundary. The prism picks
   a face; it does not own a second content model, router or activity engine.

This permits presentation to change while information architecture stays stable.
Keeping two explicit compositions costs more maintenance than swapping colors,
but it permits real visual differences without duplicating content or pretending
an XPay2 layout is merely a palette.

## This implementation batch

The restored transition is default-theme behavior. Playful circles retain their
own controller and physics rather than becoming navigation. Activity ingestion
produces theme-neutral data for the existing stream. Archive cleanup preserves
the PHP/PE references needed to assess later faces. None of these changes enables
the prism or claims that all six faces have been designed.
