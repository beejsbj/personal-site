import { ValidationError } from "../errors.mjs";
import {
  assertHttpUrl,
  assertIso,
  assertObject,
  assertShortString,
} from "../validation.mjs";

/**
 * Translates a saved/public GitHub webhook fixture. It is not an HTTP receiver,
 * does not verify webhook signatures, and does not make network requests.
 */
export function fromGithubPullRequest(
  input,
  { observedAt = new Date().toISOString() } = {},
) {
  assertObject(input, "GitHub pull request payload");
  const repository = assertObject(input.repository, "GitHub repository");
  if (repository.private !== false)
    throw new ValidationError(
      "GitHub repository.private must explicitly be false; private or unknown repositories are never ingested.",
    );
  const fullName = assertShortString(
    repository.full_name,
    "GitHub repository.full_name",
    160,
  );
  const pullRequest = assertObject(input.pull_request, "GitHub pull_request");
  const number = pullRequest.number ?? input.number;
  if (!Number.isInteger(number) || number < 1)
    throw new ValidationError(
      "GitHub pull request number must be a positive integer.",
    );
  const action = assertShortString(input.action, "GitHub action", 40);
  const occurredAt = assertIso(
    pullRequest.updated_at ?? pullRequest.created_at,
    "GitHub pull_request timestamp",
  );
  const href = assertHttpUrl(
    pullRequest.html_url,
    "GitHub pull_request.html_url",
  );
  const title = assertShortString(
    pullRequest.title,
    "GitHub pull_request.title",
    280,
  );
  return {
    source: "github",
    producer: `github:${fullName}`,
    providerEventId: `pull-request:${fullName}#${number}`,
    eventKind: "pull-request",
    mode: "event",
    occurredAt,
    observedAt: assertIso(observedAt, "observedAt"),
    candidate: {
      title: `Pull request ${action}: ${title}`,
      summary: `GitHub pull request #${number} in ${fullName}.`,
      href,
      linkLabel: "View pull request",
    },
  };
}
