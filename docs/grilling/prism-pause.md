# Prism Portfolio

Status: resumed on 2026-09-30 after the base site shipped. The first build is on
`prism/lenses-and-lure`.

The prism is the second layer of the personal site. The base site still comes
first, and the prism must not add, remove, or rename base content types.

## Resolved Prism Decisions

- Visitors initially experience the site as a normal portfolio.
- The normal portfolio is happening inside the prism.
- The first reveal is curiosity-driven, not a forced timed intro.
- The exit affordance is the `Prism Lure`: alive, catchable, playfully evasive, and generous.
- Catching the lure triggers a camera pull-back, revealing the portfolio as a prism face.
- Outside-prism movement is fixed face-to-face travel, not free flight.
- The faces are visual skins over the same portfolio structure, not separate content modes or story worlds.

## What the first build decided

- **Five faces on a pentagonal prism.** This replaced the earlier plan for six faces. A prism splits one white beam into colours, so the stage shows white light going in and a five-band spectrum coming out, one band per lens.
- **Lenses:**
  1. Daylight: the warm welcome, the default.
  2. Calling Card: the Roll to Win lottery, Persona 5.
  3. Cut Paper: EmotiTone.
  4. Back Page: Dotfight.
  5. Hion: Yumi and the Nightmare Painter, via the Spin to Win roulette.
- **How a lens works:**
  - A lens is `data-lens` on `<html>`, applied before paint and after every client swap.
  - Each lens CSS file in `src/prism/lenses/` is the visual-value authority for its skin and must scope every selector to itself.
- **Faces are live same-origin iframes** of the current page. What you see from outside is exactly what you step into.
- **Curiosity triggers:** 20s of lingering, reading past 85% of the page, or a second page view.
- **The lure:**
  - It flinches from fast grabs but never from slow approaches.
  - It tires after three escapes.
  - Keyboard activation always catches it.
  - Once found, it docks in the corner for revisiting.
- **First Journey only moves forward.** Revisiting unlocks going back and jumping to a face.
- **Afterimage:** each exit leaves a stronger burn-in of the lens you left.

## Non-Goals Still Standing

- Do not treat faces as creature/story sides or add a clay-creature side yet.
- Do not make the prism taxonomy override the base site.

## Open Threads

- The interior from the original chat: smudging, the Matrix wake-up, the clay rescue, Otto/Rose/Claw, and ghost users.
- A slow, screen-wide tilt that invites phones into landscape.
- Whether lenses should get markup hooks (per-letter spans for the Persona 5 ransom-note type, for example) instead of being pure CSS.
