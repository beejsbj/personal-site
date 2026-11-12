---
title: "Strudel tools"
summary: "Two small tools that take a hum or a MIDI file and give back Strudel code you can read."
place: "bench"
links:
  - label: "Open Melograph"
    url: "https://melograph-swart.vercel.app"
  - label: "Melograph source"
    url: "https://github.com/beejsbj/melograph"
  - label: "Open midi-strudel"
    url: "https://midi-strudel.vercel.app"
  - label: "midi-strudel source"
    url: "https://github.com/beejsbj/midi-strudel"
cover: "/images/lab/strudel-tools.png"
media:
  - type: "image"
    src: "/images/lab/strudel-tools.png"
    alt: "Melograph's opening screen: the words \"sing it before it disappears\" above a yellow pitch line drawn across a dark grid, with a record button at the top."
    width: 800
    height: 600
  - type: "image"
    src: "/images/lab/strudel-tools-midi-strudel.png"
    alt: "midi-strudel's page: \"drop a MIDI file, get strudel code\", three numbered steps, an upload box, and a sample of the Strudel code it writes."
    width: 800
    height: 600
order: 2
---

[Strudel](https://strudel.cc/) is a live coding environment for music that runs in the browser. Instead of a piano roll, you describe repeating patterns in code. These two tools get a melody into that form.

## midi-strudel

I got too obsessed with Epic: The Musical and wanted to see its melodies as Strudel code. That was the whole spark. midi-strudel takes a MIDI file, parses the tracks, and turns them into code I can read, tweak, and send into the Strudel REPL without starting from scratch.

The notation is my own idea of how to write melody, harmony, overlap, rests, and timing so they stay readable. It is not trying to be an official account of Strudel syntax.

## Melograph

Melograph starts from a voice instead of a file. Hum or sing a phrase and it gives back three things to inspect and change: the raw pitch contour, the notes it heard, and patterns for the Strudel REPL. It keeps each take separate rather than averaging them into one melody.

Listening is the test. The confidence values are diagnostics, not truth.
