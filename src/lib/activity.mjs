/**
 * Select a static snapshot without mutating the content collection.
 * Expiry is evaluated at render/build time, not continuously in deployed HTML.
 * Newest first; updates on the same day go in `id` order when they have one,
 * so the order never depends on how the collection happened to load.
 * @template {{date: string, expiresAt?: string, id?: string | number}} T
 * @param {T[]} updates
 * @param {Date} [now]
 * @returns {T[]}
 */
export function selectActivitySnapshot(updates, now = new Date()) {
  const timestamp = now.getTime();
  return updates
    .filter((update) => Date.parse(update.date) <= timestamp)
    .filter(
      (update) => !update.expiresAt || Date.parse(update.expiresAt) > timestamp,
    )
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        String(left.id ?? "").localeCompare(String(right.id ?? "")),
    );
}
