import {
  DEFAULT_POLICY,
  EVENT_KINDS,
  PRESENCE_KINDS,
  SOURCES,
} from "./constants.mjs";
import { PolicyError } from "./errors.mjs";
import {
  assertEventType,
  assertObject,
  assertShortString,
} from "./validation.mjs";

export function validatePolicy(value) {
  assertObject(value, "policy");
  if (value.version !== 1) throw new PolicyError("policy version must be 1.");
  assertObject(value.sources, "policy.sources");
  const sources = {};
  for (const source of SOURCES) {
    const rule = value.sources[source];
    if (!rule) throw new PolicyError(`policy.sources.${source} is required.`);
    assertObject(rule, `policy.sources.${source}`);
    if (typeof rule.enabled !== "boolean")
      throw new PolicyError(`${source}.enabled must be boolean.`);
    if (
      !Array.isArray(rule.producers) ||
      rule.producers.some((id) => typeof id !== "string" || !id.trim())
    ) {
      throw new PolicyError(
        `${source}.producers must be an explicit string allowlist.`,
      );
    }
    if (rule.review !== "required")
      throw new PolicyError(`${source}.review must be required.`);
    sources[source] = {
      enabled: rule.enabled,
      producers: rule.producers.map((id) =>
        assertShortString(id, `${source}.producer`, 160),
      ),
      review: rule.review,
    };
  }
  const autoPublish = value.autoPublish ?? [];
  if (!Array.isArray(autoPublish))
    throw new PolicyError("policy.autoPublish must be an array.");
  const ruleKeys = new Set();
  const normalizedRules = autoPublish.map((rule, index) => {
    assertObject(rule, `policy.autoPublish[${index}]`);
    const source = assertShortString(
      rule.source,
      `autoPublish[${index}].source`,
      40,
    );
    if (!SOURCES.includes(source))
      throw new PolicyError(`autoPublish[${index}].source is unknown.`);
    const producer = assertShortString(
      rule.producer,
      `autoPublish[${index}].producer`,
      160,
    );
    if (producer.includes("*"))
      throw new PolicyError(
        "autoPublish producers must be exact; wildcards are not allowed.",
      );
    if (!sources[source].producers.includes(producer)) {
      throw new PolicyError(
        `autoPublish producer ${producer} is not allowlisted for ${source}.`,
      );
    }
    const eventType = assertEventType(
      rule.eventType,
      `autoPublish[${index}].eventType`,
    );
    if (eventType.includes("*"))
      throw new PolicyError(
        "autoPublish event types must be exact; wildcards are not allowed.",
      );
    const eventKind = assertShortString(
      rule.eventKind,
      `autoPublish[${index}].eventKind`,
      40,
    );
    if (!EVENT_KINDS.includes(eventKind) || PRESENCE_KINDS.has(eventKind)) {
      throw new PolicyError(
        "autoPublish rules may only target durable event kinds.",
      );
    }
    const key = `${source}:${producer}:${eventType}:${eventKind}`;
    if (ruleKeys.has(key))
      throw new PolicyError(`Duplicate autoPublish rule ${key}.`);
    ruleKeys.add(key);
    return { source, producer, eventType, eventKind };
  });
  return { version: 1, sources, autoPublish: normalizedRules };
}

export function assertAllowedByPolicy(event, policy) {
  const rule = policy.sources[event.source];
  if (!rule.enabled)
    throw new PolicyError(`Source ${event.source} is disabled by policy.`);
  if (!rule.producers.includes(event.producer)) {
    throw new PolicyError(
      `Producer ${event.producer} is not allowlisted for ${event.source}.`,
    );
  }
  return rule;
}

export function defaultPolicy() {
  return structuredClone(DEFAULT_POLICY);
}

export function matchingAutoPublishRule(event, policy) {
  if (event.mode !== "event" || !event.eventType) return undefined;
  return policy.autoPublish.find(
    (rule) =>
      rule.source === event.source &&
      rule.producer === event.producer &&
      rule.eventType === event.eventType &&
      rule.eventKind === event.eventKind,
  );
}
