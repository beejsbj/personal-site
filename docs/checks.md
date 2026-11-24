# Checks, hooks and PR gates

What runs where, so a change is checked before it merges and a PR carries its evidence.

| Where | What runs | Source |
|---|---|---|
| `git commit` (pre-commit hook) | `pnpm lint`; when anything under `src/` (content markdown included), `astro.config.mjs`, `tsconfig.json`, `package.json` or the lockfile is staged also `pnpm check`, `pnpm build` and the full `pnpm test`; when only test files are staged, just those files. Docs-only and asset-only commits skip all of it. | `.githooks/pre-commit`, `scripts/pre-commit.mjs` |
| `git push` (pre-push hook) | the privacy scan over what the push adds | `.githooks/pre-push`, `scripts/privacy/` |
| Every PR and push to `main` | `lint`, `check`, `test` (builds first, then the full suite): three jobs | `.github/workflows/ci.yml` |
| Every PR | `verification-section`, `test-integrity` (re-run when the description is edited) | `.github/workflows/pr-gates.yml`, `scripts/pr-gates/` |
| Every PR and push to `main` | `privacy-scan`: personal paths, emails and identities, and a missing `LICENSE` | `.github/workflows/privacy.yml`, `scripts/privacy/` |
| Every PR | `review-evidence`: every review thread resolved, with a reply that shows why | `.github/workflows/review-evidence.yml` |

Not in CI: `pnpm test:prism` (the Chromium browser suites). It takes 6 to 8 minutes even on a
64-core box and needs a Chromium install, so it stays a bjslab job: run it through
`cockpit resources run --profile portable-browser` (see the README's Verify section). A change
to Prism should have a run of it recorded in its PR's `## Verification`.

## Lint (Biome, baselined)

`pnpm lint` runs Biome's linter over `src/`, `scripts/tests/` and `astro.config.mjs`. Prettier still
owns formatting (`pnpm format`); Biome's formatter is off. The config is `biome.jsonc`.

It is a **baseline**: Biome's recommended rules, minus the rules that already had hits when it was
added. Those rules are listed `off` in `biome.jsonc` with their hit counts, so every other rule fails
on any violation and nothing existing has to be fixed first. The cost: a new violation of a
grandfathered rule (for example a `!` non-null assertion) is not caught. To ratchet, fix one rule's
hits and delete its line. Biome reads only an `.astro` file's frontmatter, so unused-import and
unused-variable rules are off for `.astro`. Not linted at all: CSS, the `<script>` blocks and templates of `.astro` files, and the archived scripts under `scripts/` (only `scripts/tests`, `pr-gates`, `privacy`, `pre-commit.mjs` and `install-hooks.mjs` are in scope).

## The hook

`pnpm install` runs `prepare`, which sets `core.hooksPath=.githooks` (`scripts/install-hooks.mjs`).
The setting lives in the repository's shared git config, so every worktree of the checkout gets the
hook. A commit in a worktree with no `node_modules` fails with an instruction to run
`pnpm install --frozen-lockfile`; it does not skip quietly. The cost for agent-driven worktrees: every fresh worktree needs an install before its first non-docs commit, and a source commit then runs a build and the suite. The hook runs the working tree, not the staged snapshot, so a partial `git add -p` can pass or fail on unstaged code. The installer does nothing in CI, on
Vercel, outside a git checkout, or when `core.hooksPath` is already set to something else.

`node --test` has no "related tests" selection and the suite reads the built output in `dist/`, so a source
change runs `pnpm build` and then the whole `pnpm test` (about a minute). Skip once with `git commit --no-verify`; CI is
the backstop and runs the same checks.

The checks run without the variables git exports to locate the repository (`GIT_DIR`, `GIT_INDEX_FILE`
and the rest; `checkEnv` in `scripts/pre-commit.mjs`). With them, the tests that build scratch repos in a
temp dir ran `git init` and `git config` against this repository instead, made it bare and wrote their
`practice` identity into it.

## Gate 1: a Verification section

The PR description must contain a `## Verification` section of at least 30 characters that are not a
placeholder: the commands you ran and what they showed, or `Not run: <why>`. The PR template
(`.github/pull_request_template.md`) has the heading. An empty section, `TODO`, `n/a`, or only the
template's comment fails.

## Gate 2: tests deleted, skipped or loosened

The check diffs every test file (`scripts/**/*.test.mjs`, `*.browser.mjs`, anything under
`__tests__/`) against the PR's merge-base and fails when it finds, without a stated reason:

| Finding | Meaning |
|---|---|
| `deleted-file` | a test file was deleted |
| `skipped` | an added `.skip`, `.todo`, `.only`, `xit`, `t.skip()`, or a `skip:` option (`{ skip: true }` or Prettier's wrapped `skip: cond && "why",` line; `skip: false` is not one) |
| `removed-tests` | a test title that was in the file and is gone (a close rewording counts as a rename), or fewer cases than before |
| `removed-assertions` | fewer `assert(...)` / `assert.*(...)` calls in a file than before |
| `weakened`, `widened` | the Vitest/Jest `expect(...)` loosening checks; they see nothing here because these tests use `node:test` and `assert` |

A stated reason is one line in the PR description: `Test change: <why this is right>` (20 or more
characters; `n/a` and `<why>` do not count). One line covers every finding in the PR; the job summary
lists what it covered.

**Limits.** Line-based heuristics. On `node:test` they see deletions, skips and removed cases or
assertions; they do not see a loosened `assert.*` (a wider tolerance, `assert.ok` for `assert.equal`),
a skip written mid-line or as the shorthand `{ skip, timeout }`, a weaker assertion hidden in a helper, tests moved out of the test glob, or
a raised timeout. Measured on the last 60 first-parent commits of `main`: one flagged, a real removal
of two tests. They guard against accidents, not adversaries: a PR can edit `scripts/pr-gates/`, so
review of that directory matters. Tests for the gates are `scripts/pr-gates/pr-gates.test.mjs`
(part of `pnpm test`).

## Privacy and licence

`scripts/privacy/privacy-scan.mjs` fails a PR that adds a home-directory path, a machine mount or an
email address, or a name that is on the private list, in file content, file names, commit authors and
messages, or the PR description (even in a commit a later commit removes). On `main` it scans the
whole tree. It also fails when there is no `LICENSE`. Output is masked because CI logs on a public
repo are public.

- Intentionally public values go in `.github/privacy-allow.txt` with the narrowest rule and path.
  Today: the contact address in the site content, and the home-lab hostname the homepage names.
- The private list (personal email, hostnames, a login that is not the public name) is never in
  the repo: it is the `PRIVACY_PATTERNS` Actions secret, and `~/.config/privacy-scan/patterns` on the
  owner's machines. Keep the secret to names, never credentials: a PR's own copy of the scanner runs
  with it in its environment.
- It misses `user@host` prompts, values in images and binaries, obfuscated addresses, git history
  before the PR, and a `LICENSE` that is present but wrong.

## Making the checks required

A failing workflow blocks nothing until `main` requires it. The check names to require are `lint`,
`check`, `test`, `verification-section`, `test-integrity`, `privacy-scan` and
`review-evidence`, plus conversation resolution before merge. That is a repository ruleset and needs
admin; see issue #37.
