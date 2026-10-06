import assert from "node:assert/strict";
import test from "node:test";
import {
  chordAtHalfBar,
  inChord,
  midi,
  motif,
  realize,
  chord,
} from "../../src/prism/shells/cut-paper/music.ts";
import { parseMonth, sessionFor, sketchNotes } from "../../src/prism/shells/cut-paper/score.ts";

// Cut Paper plays the career as music. These pin down that the music is
// deliberate: one key, one progression, motifs that follow the harmony,
// and a score that places every clip at its real date.

const F_MAJOR = new Set([5, 7, 9, 10, 0, 2, 4]); // pitch classes of F G A Bb C D E
const SLUGS = ["dayshaper", "conduit-market", "api3-ecosystem", "flashcards", "qrng", "e4p", "garden", "a", "zz-top", "motion-path-graph"];

test("every degree is a pitch of F major", () => {
  for (let degree = -21; degree <= 21; degree += 1) assert.ok(F_MAJOR.has(midi(degree) % 12), `degree ${degree}`);
  assert.equal(midi(0), 65);
});

test("a motif is the same every time for the same name, and differs across names", () => {
  for (const slug of SLUGS) assert.deepEqual(motif(slug), motif(slug));
  const shapes = new Set(SLUGS.map((slug) => JSON.stringify(realize(motif(slug), () => chord(0)))));
  assert.ok(shapes.size >= SLUGS.length - 2, "motifs should be mostly distinct");
});

test("motifs follow the harmony: chord tones on the beats and at the end, steps between, within range", () => {
  const changes = [chord(0), chord(5), chord(1), chord(4)];
  for (const slug of SLUGS)
    for (let shift = 0; shift < 6; shift += 1) {
      // the chord changes partway through, as it does for a clip starting off the half-bar
      const chordAt = (eighth) => changes[Math.floor((eighth + shift) / 6) % 4];
      const notes = realize(motif(slug), chordAt);
      notes.forEach((note, i) => {
        const c = chordAt(note.at);
        if (note.at % 3 === 0 || i === notes.length - 1)
          assert.ok(inChord(note.degree, c), `${slug}: note ${i} (${note.degree}) not in ${c.name}`);
        else assert.equal(Math.abs(note.degree - notes[i - 1].degree), 1, `${slug}: weak-beat note ${i} should step`);
        assert.ok(note.degree >= 0 && note.degree <= 13, `${slug}: ${note.degree} out of range`);
        assert.ok(note.at + note.length <= 6, `${slug}: runs past half a bar`);
      });
    }
});

test("the progression is I–vi–ii–V and every play-through ends V then home", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => chordAtHalfBar(i, 20).name), ["Fmaj7", "Dm7", "Gm7", "C7"]);
  assert.equal(chordAtHalfBar(19, 20).name, "C7");
  assert.equal(chordAtHalfBar(17, 18).name, "C7");
});

const content = {
  projects: [
    { slug: "newest", kind: "Project", year: 2026, dateLabel: "Sep 2026" },
    { slug: "arcade", kind: "Arcade", year: 2021, dateLabel: "May 2021" },
  ],
  resume: {
    experience: { roles: [{ id: "job", start: "2022-01", end: "2024-11", current: false }, { id: "undated", current: false }] },
    education: { entries: [{ id: "course", start: "2020-09", end: "2020-12", current: false }] },
  },
  updates: [
    { id: "u1", kind: "project", date: "2026-09-11" },
    { id: "u2", kind: "milestone", date: "2026-09-11" },
  ],
};

test("the score places clips at their dates and keeps every note inside the session", () => {
  const now = 2026.75;
  const s = sessionFor(content, now);
  assert.equal(s.from, 2020.5);
  assert.ok(s.end >= 2026.75 + 0.4 && s.end % 0.5 === 0, `end ${s.end}`);
  const project = s.clips.find((c) => c.id === "project:newest");
  assert.equal(project.start, parseMonth("Sep 2026", 2026));
  assert.equal(project.voice, "lead");
  assert.equal(s.clips.find((c) => c.id === "project:arcade").voice, "chip");
  assert.ok(!s.clips.some((c) => c.ref === "undated"), "undated roles stay off the timeline");
  for (let i = 1; i < s.events.length; i += 1) assert.ok(s.events[i].t >= s.events[i - 1].t);
  for (const e of s.events) assert.ok(e.t >= s.from && e.t <= s.end + 1e-9, `event at ${e.t}`);
  // the bass walks only while a role or course runs
  for (const e of s.events.filter((e) => e.track === "roles"))
    assert.ok((e.t >= 2020 + 8 / 12 && e.t < 2021) || (e.t >= 2022 && e.t < 2024 + 11 / 12), `bass at ${e.t}`);
  // the project's events are its realized motif
  assert.deepEqual(
    s.events.filter((e) => e.track === "project:newest").map((e) => e.degree),
    project.notes.map((n) => n.degree),
  );
  // bells on the same day strum rather than stack
  const bells = s.events.filter((e) => e.track === "markers" && e.t < s.end);
  assert.equal(bells.length, 2);
  assert.notEqual(bells[0].t, bells[1].t);
});

test("lab sketches have motifs over the home chord", () => {
  const notes = sketchNotes("beating-shapes");
  assert.ok(notes.length >= 2);
  assert.ok(inChord(notes.at(-1).degree, chord(0)));
});
