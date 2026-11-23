import assert from "node:assert/strict";
import test from "node:test";
import { install } from "../install-hooks.mjs";
import { checkEnv, plan } from "../pre-commit.mjs";

const names = (files) => plan(files, () => true).map((step) => step.name);

test("a docs-only commit skips every check", () => {
  assert.deepEqual(names(["README.md", "docs/production.md", "LICENSE"]), []);
});

test("content under src/ is source, not docs", () => {
  assert.deepEqual(names(["src/content/pages/home.md"]), [
    "lint",
    "type check",
    "build",
    "tests (full suite, source changed)",
  ]);
  assert.deepEqual(names(["docs/production.md", "public/images/x.png"]), []);
});

test("a source commit runs lint, the type check and the full suite", () => {
  assert.deepEqual(names(["src/prism/stage.ts"]), [
    "lint",
    "type check",
    "build",
    "tests (full suite, source changed)",
  ]);
  assert.deepEqual(names(["package.json"]), [
    "lint",
    "type check",
    "build",
    "tests (full suite, source changed)",
  ]);
});

test("a commit of only test files lints and runs just those files", () => {
  const steps = plan(
    ["scripts/tests/prism.test.mjs", "scripts/pr-gates/lib.mjs"],
    () => true,
  );
  assert.deepEqual(
    steps.map((step) => step.name),
    ["lint", "staged tests"],
  );
  assert.deepEqual(steps.at(-1).args, [
    "exec",
    "node",
    "--test",
    "scripts/tests/prism.test.mjs",
  ]);
});

test("a deleted test file has nothing to run, so only lint runs", () => {
  assert.deepEqual(
    plan(["scripts/tests/gone.test.mjs"], () => false).map((step) => step.name),
    ["lint"],
  );
});

test("a commit that only deletes source still lints, type-checks and runs the suite", () => {
  assert.deepEqual(
    plan(["src/gone.ts"], () => false).map((step) => step.name),
    ["lint", "type check", "build", "tests (full suite, source changed)"],
  );
});

function fakeGit(config) {
  const calls = [];
  const git = (...args) => {
    calls.push(args.join(" "));
    if (args[0] === "config" && args[1] === "--get") {
      if (config.hooksPath) return config.hooksPath;
      throw new Error("unset");
    }
    return "";
  };
  return { git, calls };
}

test("installing points git at .githooks once, and leaves another hooksPath alone", () => {
  let fake = fakeGit({});
  assert.equal(
    install({ env: {}, git: fake.git, exists: () => true }),
    "installed",
  );
  assert.ok(fake.calls.includes("config core.hooksPath .githooks"));
  fake = fakeGit({ hooksPath: ".githooks" });
  assert.equal(
    install({ env: {}, git: fake.git, exists: () => true }),
    "already installed",
  );
  fake = fakeGit({ hooksPath: "/somewhere/else" });
  assert.match(
    install({ env: {}, git: fake.git, exists: () => true }),
    /already \/somewhere\/else/,
  );
  assert.ok(
    !fake.calls.some((call) => call.startsWith("config core.hooksPath")),
  );
});

test("installing does nothing when the checkout has no .githooks", () => {
  const fake = fakeGit({});
  assert.equal(
    install({ env: {}, git: fake.git, exists: () => false }),
    "skipped: no .githooks",
  );
  assert.deepEqual(fake.calls, []);
});

test("installing does nothing in CI or on Vercel", () => {
  for (const env of [{ CI: "true" }, { VERCEL: "1" }]) {
    const fake = fakeGit({});
    assert.equal(
      install({ env, git: fake.git, exists: () => true }),
      "skipped: CI",
    );
    assert.deepEqual(fake.calls, []);
  }
});

test("the checks never inherit where the hook's repository lives", () => {
  // Git exports these to hooks; a test's scratch repo in a temp dir would
  // otherwise resolve to this repository (and make it bare).
  const env = checkEnv({
    PATH: "/bin",
    LANG: "C",
    GIT_DIR: "/repo/.git/worktrees/w",
    GIT_INDEX_FILE: "/repo/.git/worktrees/w/index",
    GIT_WORK_TREE: "/repo",
    GIT_COMMON_DIR: "/repo/.git",
    GIT_PREFIX: "src/",
    GIT_OBJECT_DIRECTORY: "/repo/.git/objects",
    GIT_ALTERNATE_OBJECT_DIRECTORIES: "/other/objects",
    GIT_NAMESPACE: "ns",
    GIT_AUTHOR_NAME: "Someone",
  });
  assert.deepEqual(env, {
    PATH: "/bin",
    LANG: "C",
    GIT_AUTHOR_NAME: "Someone",
  });
});
