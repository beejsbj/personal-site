# Astro Overhaul Checklist

## Phase 1: Foundation
- [x] Create `codex/astro-portfolio-rebuild`
- [x] Add Astro project scaffold files
- [x] Install Astro, Vue, MDX, Vercel, and design dependencies
- [x] Set up base layout, routing shell, and content collections

## Phase 2: Content Migration
- [x] Migrate project content into Astro collections
- [x] Migrate core pages into Astro collections
- [x] Preserve useful media under `public/`
- [x] Tag entries as featured, lab, or hidden

## Phase 3: Design System
- [x] Build core design tokens and layout primitives
- [x] Create `default` and `pe-site` theme folders
- [x] Apply the launch theme across the site

## Phase 4: Main Portfolio
- [x] Build home page
- [x] Build projects index and project detail pages
- [x] Build about and resume pages

## Phase 5: Lab
- [x] Build lab index and lab detail pages
- [x] Move Garden, E4P, and style guide into Lab

## Phase 6: Motion and Polish
- [x] Add shared page transitions and landing-page motion
- [ ] Refine responsive behavior and accessibility
- [x] Add SEO metadata and canonical URLs

## Phase 7: Redirects and Validation
- [x] Add legacy route redirects
- [x] Run `pnpm check`
- [x] Build and smoke test the Astro site
