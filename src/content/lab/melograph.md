---
title: "Melograph"
summary: "Hum or sing a phrase and get back a pitch line, the notes it heard, and Strudel code you can read."
place: "bench"
links:
  - label: "Open Melograph"
    url: "https://melograph-swart.vercel.app"
  - label: "Source"
    url: "https://github.com/beejsbj/melograph"
cover: "/images/lab/melograph.png"
media:
  - type: "image"
    src: "/images/lab/melograph.png"
    alt: "Melograph's opening screen: the words \"sing it before it disappears\" above a yellow pitch line drawn across a dark grid, with a record button at the top."
    width: 800
    height: 600
order: 2
---

[Strudel](https://strudel.cc/) is a live coding environment for music that runs in the browser. Instead of a piano roll, you describe repeating patterns in code. Melograph gets a melody into that form, starting from a voice instead of a file.

Hum or sing a phrase and it gives back three things to inspect and change: the raw pitch contour, the notes it heard, and patterns for the Strudel REPL. It keeps each take separate rather than averaging them into one melody.

Listening is the test. The confidence values are diagnostics, not truth.
