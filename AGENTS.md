# Working on burooj.dev

Burooj's portfolio: an Astro site deployed on Vercel from `main`. It is "the
prism": one body of content shown through five lenses (Daylight, Calling Card,
Cut Paper, Back Page, Hion). Read `CONTEXT.md` for the language and
`docs/prism/lens-map.md` for how the lenses work.

## Where work is tracked

**GitHub Issues on this repository** are the tracker for this site: bugs,
features, lens work, open questions and decisions. Look there first, link work
to an issue (`Fixes #N`), and open a new issue rather than keeping a private
list. Older notes in `docs/` that name `BJS-…` IDs refer to a retired private
tracker; their GitHub issues are linked where one exists.

**This repository is public.** Issues, PRs, commits and docs must not carry
private detail: no home-server internals, hostnames or paths, no private repos
or projects, no people, family or business detail, no keys, tokens or
infrastructure settings. Naming bjslab as Burooj's lab is fine; how it is built
is not. When in doubt, leave it out.

## Rules that tests enforce

- All authored copy lives in `src/content`. Lenses read `/prism/content.json`;
  the one exception is `fallbackBody(route)`, which reads the page's own
  `<main>` for `other` routes (the 404 page, for instance).
- Lens voice copy goes in `src/content/lenses/<id>.json` and must not repeat
  portfolio content (the drift test).
- Lens CSS is scoped to `:root[data-lens="<id>"]`; keyframes are prefixed
  `<id>-`.
- What every lens must do in and around the prism (settled arrivals, idle
  loops, fixed elements) is in `docs/prism/lens-map.md` §7.

## Checking a change

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm build
corepack pnpm test
PRISM_CHROMIUM=<path to a Chromium binary> corepack pnpm test:prism
```

`test:prism` uses `PRISM_CHROMIUM`, else the newest cached Playwright headless
shell, and skips when it finds neither: "pass 0" is not a pass. Expect
"75 lens × route pages" and "72 lens × fixture pages".
`astro preview` doesn't work with the Vercel adapter: serve the built handler
the way `scripts/tests/prism-parity.browser.mjs` does.

## Git and PRs

- Small, atomic commits; one concern per PR.
- Never force-push, rebase a shared branch, or use a bare `git stash`. Bring a
  base branch in with a merge.
- Merging to `main` deploys to production: only with Burooj's go-ahead.
- Every resolved review thread needs a reply the `review-evidence` check can
  read: `Fixed in <sha>`, `Declined: <reason>` (or `Not a bug:` /
  `Obsolete:` / `Duplicate:`), or `Tracked in #<issue>`.
