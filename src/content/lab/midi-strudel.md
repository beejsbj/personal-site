---
title: "midi-strudel"
summary: "Drop in a MIDI file and get back Strudel code you can read."
place: "bench"
links:
  - label: "Open midi-strudel"
    url: "https://midi-strudel.vercel.app"
  - label: "Source"
    url: "https://github.com/beejsbj/midi-strudel"
cover: "/images/lab/midi-strudel.png"
media:
  - type: "image"
    src: "/images/lab/midi-strudel.png"
    alt: "midi-strudel's page: \"drop a MIDI file, get strudel code\", three numbered steps, an upload box, and a sample of the Strudel code it writes."
    width: 800
    height: 600
order: 2.5
---

[Strudel](https://strudel.cc/) is a live coding environment for music that runs in the browser. Instead of a piano roll, you describe repeating patterns in code.

I got too obsessed with Epic: The Musical and wanted to see its melodies as Strudel code. That was the whole spark. midi-strudel takes a MIDI file, parses the tracks, and turns them into code I can read, tweak, and send into the Strudel REPL without starting from scratch.

The notation is my own idea of how to write melody, harmony, overlap, rests, and timing so they stay readable. It is not trying to be an official account of Strudel syntax.
