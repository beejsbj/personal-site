/** A redacted update's line, read in a browser the same way in every lens.
 * Hand `redactedLine` to a locator's `evaluate`, on the update's element:
 * it finds the line (`[data-redaction-line]`) and reads its parts in
 * document order, a word (`[data-redaction-word]`) as written and a bar
 * (`[data-redaction-bar]`) by its box. `said` is the line as assistive
 * technology reads it: every word in it that is not hidden from the
 * accessibility tree, in order. */
export function redactedLine(entry) {
  const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const line = entry.querySelector("[data-redaction-line]");
  if (!line) return null;
  const said = [];
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest("[aria-hidden='true']")) continue;
    if (node.textContent.trim()) said.push(text(node));
  }
  const box = (el) => {
    const { left, right, top, bottom, width, height } =
      el.getBoundingClientRect();
    return { left, right, top, bottom, width, height };
  };
  return {
    said: said.join(" "),
    box: box(line),
    parts: [
      ...line.querySelectorAll("[data-redaction-word], [data-redaction-bar]"),
    ].map((el) => ({
      ...(el.hasAttribute("data-redaction-word")
        ? { word: text(el) }
        : { bar: text(el) }),
      box: box(el),
      shown: el.checkVisibility(),
      hidden: !!el.closest("[aria-hidden='true']"),
    })),
  };
}

/** What a line with these `parts` must be, checked against what
 * `redactedLine` read: its words and bars in order (a bar said aloud as
 * `bar`, once), every part shown, a longer number a longer bar, and all of
 * it flowing as one line that wraps inside `within` (a box), never running
 * past it. */
export function checkRedactedLine(assert, read, parts, { bar, within }) {
  assert.ok(read, "the update has a line");
  assert.deepEqual(
    read.parts.map((part) => ("word" in part ? part.word : { bar: part.bar })),
    parts.map((part) => (typeof part === "string" ? part : { bar })),
    "its words as written and its bars, in order",
  );
  assert.equal(
    read.said,
    parts.map((part) => (typeof part === "string" ? part : bar)).join(" "),
    "read aloud: each word, and each bar once",
  );
  for (const [i, part] of read.parts.entries()) {
    assert.ok(part.shown && part.box.width > 0, `part ${i} is shown`);
    assert.ok(!part.hidden, `part ${i} is not hidden from a screen reader`);
    assert.ok(
      part.box.left >= within.left - 1 && part.box.right <= within.right + 1,
      `part ${i} keeps inside its update (${part.box.left} to ${part.box.right} in ${within.left} to ${within.right})`,
    );
    const before = read.parts[i - 1];
    if (!before) continue;
    // On the same row and to the right, or on a row further down.
    const sameRow =
      part.box.top < before.box.bottom && part.box.bottom > before.box.top;
    assert.ok(
      sameRow
        ? part.box.left >= before.box.right - 1
        : part.box.top >= before.box.top,
      `part ${i} follows part ${i - 1} on the line`,
    );
  }
  // Longer numbers, longer bars.
  const bars = read.parts.filter((part) => "bar" in part);
  const lengths = parts.filter((part) => typeof part === "number");
  const order = (list) =>
    list
      .map((value, index) => [value, index])
      .sort(([a], [b]) => a - b)
      .map(([, index]) => index);
  assert.deepEqual(
    order(bars.map((part) => part.box.width)),
    order(lengths),
    `a longer number is a longer bar (${bars.map((part) => part.box.width)} for ${lengths})`,
  );
}
