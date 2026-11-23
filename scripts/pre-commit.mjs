#!/usr/bin/env node
// Pre-commit: lint, type check and tests for what is staged.
//   lint        `pnpm lint` (Biome) when any code or config is staged
//   type check  `pnpm check` (astro check) when anything under src/ or a TS/Astro config is staged
//   tests       the staged *.test.mjs files, or `pnpm build` then the whole `pnpm test` when source under
//               src/ changed (node:test has no "related tests" selection, and the suite reads dist/)
// Docs-only commits skip all three. Skip once with `git commit --no-verify`; CI runs the same.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NOT_CODE = /\.(?:md|mdx|txt|png|jpe?g|svg|webp|ico|woff2?|mp4)$|^docs\/|^LICENSE$/
const TEST_FILE = /^scripts\/(?:tests|pr-gates|privacy)\/[^/]+\.test\.mjs$/
const SOURCE = /^(?:src\/|astro\.config\.mjs$|tsconfig\.json$|package\.json$|pnpm-lock\.yaml$)/

export function stagedFiles() {
  return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean)
}

/** The checks to run for a set of staged files, in order. Empty when only docs or assets are staged. */
export function plan(files, exists = path => existsSync(resolve(root, path))) {
  if (!files.some(file => !NOT_CODE.test(file))) return []
  const steps = [{ name: 'lint', args: ['lint'] }]
  if (files.some(file => SOURCE.test(file))) steps.push({ name: 'type check', args: ['check'] })
  if (files.some(file => SOURCE.test(file))) {
    steps.push({ name: 'build', args: ['build'] })
    steps.push({ name: 'tests (full suite, source changed)', args: ['test'] })
  } else {
    // A deleted test has nothing to run; the full suite would catch what it covered, CI does.
    const tests = files.filter(file => TEST_FILE.test(file) && exists(file))
    if (tests.length) steps.push({ name: 'staged tests', args: ['exec', 'node', '--test', ...tests] })
  }
  return steps
}

/** pnpm on PATH, else the version pinned in package.json through corepack. */
export function pnpm() {
  const found = spawnSync('pnpm', ['--version'], { stdio: 'ignore' })
  return found.status === 0 ? { command: 'pnpm', prefix: [] } : { command: 'corepack', prefix: ['pnpm'] }
}

function main() {
  const steps = plan(stagedFiles())
  if (!steps.length) { console.log('pre-commit: nothing staged, or only docs/assets: skipping checks.'); return 0 }
  if (!existsSync(resolve(root, 'node_modules'))) {
    console.error('pre-commit: node_modules is missing, so the checks cannot run. Run `pnpm install --frozen-lockfile` (or skip once with `git commit --no-verify`; CI will still run them).')
    return 1
  }
  const { command, prefix } = pnpm()
  for (const step of steps) {
    console.log(`\npre-commit: ${step.name}`)
    const started = Date.now()
    const result = spawnSync(command, [...prefix, ...step.args], { cwd: root, stdio: 'inherit' })
    if (result.status !== 0) {
      console.error(`\npre-commit: ${step.name} failed (exit ${result.status ?? result.signal}). Fix it, or skip once with \`git commit --no-verify\` (CI will still run it).`)
      return result.status ?? 1
    }
    console.log(`pre-commit: ${step.name} passed in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main()
