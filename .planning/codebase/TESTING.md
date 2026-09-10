# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**Runner:**
- No dedicated test runner is configured. No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*` files are present at the repo root.
- Current automated verification is `astro check`, run through the `check` script in `package.json`.
- Config: `package.json` and `tsconfig.json`

**Assertion Library:**
- Not detected.

**Run Commands:**
```bash
pnpm check              # Run Astro type/content diagnostics
# Watch mode: Not configured
# Coverage: Not configured
```

## Test File Organization

**Location:**
- No co-located test files or dedicated test directories are present under `src/`, `scripts/`, or the repo root.
- Searches for `*.test.*`, `*.spec.*`, and `__tests__` returned no matches.

**Naming:**
- Not applicable. No test files are present.

**Structure:**
```text
No test directory pattern detected in `src/`, `scripts/`, or the repo root.
```

## Test Structure

**Suite Organization:**
```text
No `describe`, `it`, `test`, `expect`, `beforeEach`, or `afterEach` blocks are present in the active codebase.
```

**Patterns:**
- Setup pattern: Not applicable.
- Teardown pattern: Not applicable.
- Assertion pattern: Verification currently relies on Astro compilation, content-schema validation, and TypeScript diagnostics across files such as `src/content.config.ts`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/projects/[slug].astro`, and `src/pages/lab/[slug].astro`.

## Mocking

**Framework:** Not used.

**Patterns:**
```text
No mocking utilities, stubs, spies, or network interception helpers detected.
```

**What to Mock:**
- Not applicable. No test framework is installed.

**What NOT to Mock:**
- Not applicable. No test framework is installed.

## Fixtures and Factories

**Test Data:**
```text
No fixture or factory layer detected.
```

**Location:**
- Content files are the nearest thing to verification inputs. The active app consumes `src/content/pages/*.md`, `src/content/projects/*.md`, `src/content/lab/*.md`, and `src/content/site/config.json`.
- `src/content.config.ts` validates that content through Zod during `astro check` and build-time content syncing.

## Coverage

**Requirements:** None enforced.

**View Coverage:**
```bash
# Coverage tooling is not configured
```

## Test Types

**Unit Tests:**
- Not used. No isolated test runner or assertion suite is configured for helpers, components, or middleware.

**Integration Tests:**
- Only indirect integration checking is present. `pnpm check` exercises Astro frontmatter parsing, content collection schemas, route typing, and component/template diagnostics for files included by `tsconfig.json`.
- Included verification scope comes from `tsconfig.json`: `src/**/*.ts`, `src/**/*.astro`, `src/**/*.vue`, `src/**/*.md`, `src/**/*.json`, and `astro.config.mjs`.
- Excluded directories are not part of automated checking, including `projects`, `templates`, `data`, `styles`, `images`, `assets`, `about`, `public/styles`, `.astro`, `dist`, and `.output`, as defined in `tsconfig.json`.

**E2E Tests:**
- Not used. No Playwright or Cypress setup is present, and no `.github/workflows/` CI pipeline is present to run browser automation.

## Common Patterns

**Async Testing:**
```text
No async test helpers are present. Async production code such as `await getEntry(...)`, `await getCollection(...)`, and `await entry.render()` in `src/pages/*.astro` is unchecked by dedicated tests.
```

**Error Testing:**
```text
No error-path tests are present. Current error behavior is encoded directly in production files through thrown errors and redirects.
```

---

*Testing analysis: 2026-03-27*
