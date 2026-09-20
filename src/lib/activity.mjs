/**
 * Select a static snapshot without mutating the content collection.
 * Expiry is evaluated at render/build time, not continuously in deployed HTML.
 * @template {{date: string, occurredAt?: string, expiresAt?: string}} T
 * @param {T[]} updates
 * @param {Date} [now]
 * @returns {T[]}
 */
export function selectActivitySnapshot(updates, now = new Date()) {
  const timestamp = now.getTime();
  return updates
    .filter(
      (update) => Date.parse(update.occurredAt ?? update.date) <= timestamp,
    )
    .filter(
      (update) => !update.expiresAt || Date.parse(update.expiresAt) > timestamp,
    )
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt ?? right.date) -
        Date.parse(left.occurredAt ?? left.date),
    );
}
