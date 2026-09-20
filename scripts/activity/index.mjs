#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  approve,
  defaultPolicy,
  exportStatic,
  fromAgentSessionLifecycle,
  fromBjslabMilestone,
  fromGithubPullRequest,
  fromManualEvent,
  ingest,
  listRecords,
  reject,
  retract,
} from "../../src/lib/activity-engine/index.mjs";

const usage =
  `Usage: node scripts/activity/index.mjs <command> [options]

Commands:
  policy-init [--out .activity-engine/policy.json]
  import --policy activity-policy.json --file events.json [--adapter raw|github-pr|bjslab-milestone|agent-session|manual] [--store .activity-engine]
  list [--status pending|approved|rejected|retracted] [--store .activity-engine]
  approve --id activity_... --revision N --projection approved-copy.json [--by operator] [--store .activity-engine]
  reject|retract --id activity_... [--note text] [--by operator] [--store .activity-engine]
  export [--store .activity-engine] [--out src/data/activity.public.json]

All imported records enter review. ` +
  "`candidate`" +
  ` wording in an import is private context; approval requires a separate curated projection file.`;

function parseArgs(argv) {
  const [command, ...tokens] = argv;
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--"))
      throw new Error(`Unexpected argument ${token}.`);
    const key = token.slice(2);
    if (Object.hasOwn(options, key))
      throw new Error(`Option ${token} was supplied more than once.`);
    const value = tokens[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${token}.`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function assertKnownOptions(command, options) {
  const allowed = {
    "policy-init": ["out"],
    import: ["policy", "file", "adapter", "store"],
    list: ["status", "store"],
    approve: ["id", "revision", "projection", "by", "note", "store"],
    reject: ["id", "by", "note", "store"],
    retract: ["id", "by", "note", "store"],
    export: ["store", "out"],
  };
  if (!Object.hasOwn(allowed, command)) return;
  for (const key of Object.keys(options)) {
    if (!allowed[command].includes(key))
      throw new Error(`--${key} is not valid for ${command}.`);
  }
}

const required = (options, name) => {
  if (!options[name]) throw new Error(`--${name} is required.`);
  return options[name];
};
const json = async (file) => JSON.parse(await readFile(resolve(file), "utf8"));
const output = (value) =>
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
const receipt = (record) => ({
  id: record.id,
  status: record.status,
  revision: record.revision,
  source: record.event.source,
  kind: record.event.eventKind,
  occurredAt: record.event.occurredAt,
});

function adapt(adapter, value) {
  if (adapter === "raw") return value;
  if (adapter === "github-pr") return fromGithubPullRequest(value);
  if (adapter === "bjslab-milestone") return fromBjslabMilestone(value);
  if (adapter === "agent-session") return fromAgentSessionLifecycle(value);
  if (adapter === "manual") return fromManualEvent(value);
  throw new Error(`Unknown adapter ${adapter}.`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || command === "help" || command === "--help")
    return process.stdout.write(`${usage}\n`);
  assertKnownOptions(command, options);
  if (command === "policy-init") {
    const out = resolve(options.out ?? ".activity-engine/policy.json");
    await mkdir(dirname(out), { recursive: true, mode: 0o700 });
    await writeFile(out, `${JSON.stringify(defaultPolicy(), null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    return output({
      wrote: out,
      note: "Replace fixture producer allowlists before importing real sources.",
    });
  }
  const storeDir = resolve(options.store ?? ".activity-engine");
  if (command === "import") {
    const input = await json(required(options, "file"));
    const policy = await json(required(options, "policy"));
    const values = Array.isArray(input) ? input : [input];
    const adapter = options.adapter ?? "raw";
    const results = [];
    for (const value of values) {
      // Each import completes before the next lock acquisition. A batch does
      // not race against its own exclusive store lock.
      results.push(
        await ingest({ storeDir, policy, event: adapt(adapter, value) }),
      );
    }
    return output(
      results.map(({ outcome, record }) => ({ outcome, ...receipt(record) })),
    );
  }
  if (command === "list")
    return output(
      (await listRecords(storeDir, { status: options.status })).map(receipt),
    );
  if (command === "approve") {
    const revision = required(options, "revision");
    if (!/^[1-9]\d*$/.test(revision))
      throw new Error("--revision must be a positive integer.");
    return output(
      receipt(
        await approve({
          storeDir,
          id: required(options, "id"),
          expectedRevision: Number(revision),
          projection: await json(required(options, "projection")),
          decidedBy: options.by,
          note: options.note,
        }),
      ),
    );
  }
  if (command === "reject")
    return output(
      receipt(
        await reject({
          storeDir,
          id: required(options, "id"),
          decidedBy: options.by,
          note: options.note,
        }),
      ),
    );
  if (command === "retract")
    return output(
      receipt(
        await retract({
          storeDir,
          id: required(options, "id"),
          decidedBy: options.by,
          note: options.note,
        }),
      ),
    );
  if (command === "export") {
    const outFile = resolve(options.out ?? "src/data/activity.public.json");
    return output(await exportStatic({ storeDir, outFile }));
  }
  throw new Error(`Unknown command ${command}.\n\n${usage}`);
}

main().catch((error) => {
  process.stderr.write(
    `${error.code ? `${error.code}: ` : ""}${error.message}\n`,
  );
  process.exitCode = 1;
});
