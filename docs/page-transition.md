# Default page transition

The default Astro face restores the original PHP site's circle transition. A
small warm-accent orb starts at the activated link's center, travels to the
viewport center for 0.5 seconds, grows to cover the page for 0.3 seconds, then
shrinks back toward that original link over 0.3 seconds after Astro swaps the
page. History navigation has no source link, so it starts at the viewport
center. Trigger centers are clamped to the viewport so an offscreen link cannot
place the visible animation outside the page.

`PageTransition.astro` is a unique default-face specimen. `BaseLayout` selects
it only when `theme` is `default`, while `data-theme` remains the runtime seam
for a later face. It persists through Astro's body replacement so one overlay
and one lifecycle controller serve pointer clicks, keyboard activation, and
history navigation.

`default-page-transition.ts` uses Astro's `astro:before-preparation` loader
hook to begin the circle while the next document loads. It resets on aborted
navigation, page hide, load failure, and a live change to reduced motion. It
also clears the cover after five seconds if fetching stalls, keeping the current
page readable while routing remains pending. It does not alter focus or scroll,
and the overlay never receives pointer events. With JavaScript disabled, or
with reduced motion requested, links keep normal browser navigation and no
transition is shown.
