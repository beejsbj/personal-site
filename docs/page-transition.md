# Default page transition

The default Astro face preserves the PE site's page-transition identity without
bringing back Swup or GSAP. Fourteen horizontal bands use the legacy sequence
of red, orange, yellow, green, cyan, blue and purple twice. The final purple
band starts first; all bands cover from the right, then leave to the left after
Astro swaps the page.

`PageTransition.astro` is a unique default-face specimen. `BaseLayout` selects
it only when `theme` is `default`, while `data-theme` remains the runtime seam
for a later face. It persists through Astro's body replacement so one overlay
and one lifecycle controller serve clicks, keyboard activation, and history
navigation.

`default-page-transition.ts` uses Astro's `astro:before-preparation` loader
hook to begin the sweep while the next document loads. It resets on aborted
navigation, page hide, load failure, and a live change to reduced motion. It
also clears the cover after five seconds if fetching stalls, keeping the current
page readable while routing remains pending. It
does not alter focus or scroll, and the overlay never receives pointer events.
With JavaScript disabled, or with reduced motion requested, links keep normal
browser navigation and no transition is shown.
