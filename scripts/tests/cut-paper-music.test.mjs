import assert from "node:assert/strict";
import test from "node:test";
import {
  bed,
  cadence,
  chordAt,
  creditPhrase,
  inKey,
  midiOf,
  motif,
  MOTIF_EIGHTHS,
  motifEvents,
  notesOf,
  padVoicing,
  triad,
  YEAR_EIGHTHS,
} from "../../src/prism/shells/cut-paper/music.ts";

// Cut Paper's music is meant to sound arranged, not random: one key, one
// progression, and motifs that are the same every time and land on the
// harmony. These pin that down.

const mod7 = (n) => ((n % 7) + 7) % 7;
const slugs = ["dayshaper", "conduit-market", "api3-ecosystem", "flashcards", "qrng", "e4p", "garden", "x", "a-very-long-fixture-slug"];
const starts = [2020.5, 2021.33, 2022.67, 2024.83, 2025.5, 2026.67, 2027];

test("the progression is I–vi–ii–V, a chord per half year, pinned to the calendar", () => {
  assert.deepEqual([2026, 2026.5, 2027, 2027.5, 2028].map(chordAt), [0, 5, 1, 4, 0]);
  assert.equal(chordAt(2026.49), 0);
  assert.equal(chordAt(2026.5), 5);
});

test("every motif is deterministic, in C major, in range, and nine eighths long", () => {
  for (const slug of slugs)
    for (const start of starts)
      for (let anchor = 0; anchor < 7; anchor += 1) {
        const notes = motif(slug, start, anchor);
        assert.deepEqual(notes, motif(slug, start, anchor), "same input, same tune");
        const last = notes[notes.length - 1];
        assert.equal(last.at + last.len, MOTIF_EIGHTHS);
        for (const note of notes) {
          assert.ok(inKey(midiOf(note.degree)));
          assert.ok(note.degree >= 5 && note.degree <= 14, `${slug} ${note.degree} out of range`);
        }
      }
});

test("motifs land on the harmony: strong beats on chord tones, the end on root or third", () => {
  for (const slug of slugs)
    for (const start of starts) {
      const notes = motif(slug, start, slugs.indexOf(slug));
      notes.forEach((note, index) => {
        const tones = triad(chordAt(start + note.at / YEAR_EIGHTHS));
        if (index === notes.length - 1)
          assert.ok(tones.slice(0, 2).includes(mod7(note.degree)), `${slug}@${start} ends off root/third`);
        else if (note.at % 3 === 0)
          assert.ok(tones.includes(mod7(note.degree)), `${slug}@${start} strong beat off the chord`);
      });
    }
});

test("different projects get different tunes", () => {
  const tunes = new Set(slugs.map((slug) => JSON.stringify(motif(slug, 2025, 0))));
  assert.ok(tunes.size >= slugs.length - 2);
});

test("bed, credits and cadence never leave the key", () => {
  const events = [
    ...bed(2020.5, 2027.4, 2020.5),
    ...creditPhrase(2022, 2024.9),
    ...cadence(0),
    ...motifEvents(motif("dayshaper", 2026.67, 0)),
  ];
  for (const midi of notesOf(events)) assert.ok(inKey(midi), `${midi} not in C major`);
  for (let root = 0; root < 7; root += 1) assert.equal(padVoicing(root).length, 4);
});

test("the bed covers the span exactly, one pad per half year", () => {
  const pads = bed(2021.25, 2023, 2021.25).filter((event) => event.voice === "pad");
  assert.equal(pads.length, 4);
  assert.equal(pads[0].at, 0);
  assert.equal(pads[0].len, 3);
  const total = pads.reduce((sum, event) => sum + event.len, 0);
  assert.equal(Math.round(total), Math.round((2023 - 2021.25) * YEAR_EIGHTHS));
});
