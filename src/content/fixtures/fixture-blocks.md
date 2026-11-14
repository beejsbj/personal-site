---
title: "A study told with every block"
summary: "An experiment that shows its making: pictures, a before and after, something live, a model, code, my own words, steps, files, a sound and a film."
place: "bench"
cover: "/images/lab/motion-path-graph.svg"
order: 96
links:
  - label: "Source"
    url: "https://example.com/source"
blocks:
  drawings:
    type: gallery
    items:
      - src: /images/lab/motion-path-graph.svg
        alt: A lotus drawn in orange and blue lines
        caption: The finished drawing, every path measured first.
      - src: /images/lab/beating-shapes.png
        alt: Black and white shapes on a grid
        caption: An earlier try, with shapes in place of lines.
      - src: /images/lab/game-of-life.png
        alt: A grid of live and dead cells
  redrawn:
    type: compare
    before:
      src: /images/lab/beating-shapes.png
      alt: The first version, drawn with filled shapes
    after:
      src: /images/lab/motion-path-graph.svg
      alt: The second version, drawn with lines alone
      label: A month later
    caption: The same idea, before and after I stopped filling things in.
  the-pen:
    type: embed
    kind: pen
    src: https://codepen.io/beejsbj/pen/abXZWLQ
    alt: The lotus drawing itself, one line at a time
    poster: /images/lab/motion-path-graph.svg
    caption: The Pen itself. It draws when it loads.
  the-demo:
    type: embed
    kind: demo
    src: /prism/fixtures/demo.svg
    alt: A demo that says it is running
    ratio: 16/9
  cube:
    type: model
    src: /prism/fixtures/cube.glb
    alt: A cube with a different colour on each face
    poster: /images/lab/beating-shapes.png
    caption: A model, as a `.glb` file.
  cloud:
    type: model
    src: /prism/fixtures/cloud.splat
    alt: A knot of coloured points
    caption: A Gaussian splat, as a `.splat` file.
    ratio: 4/3
    rotation: [180, 0, 0]
  the-trick:
    type: code
    language: js
    caption: The whole trick, in `draw.js`.
    code: |
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
  in-my-words:
    type: quote
    text: I wanted the line to look like it was **being drawn**, not revealed.
    source: A note to myself
    date: 2026-08
  how:
    type: steps
    items:
      - title: Measure
        text: Ask each path how long it is, with `getTotalLength()`.
      - text: Hide the stroke by offsetting it by that length.
        image:
          src: /images/lab/motion-path-graph.svg
          caption: Every stroke, hidden and waiting.
      - title: Draw
        text: Bring the offset back to zero, [one path after another](https://example.com/timeline).
  files:
    type: tree
    caption: Where it lives.
    tree: |
      lotus/
        index.html
        draw.js       # measures, then draws
        paths/
          petals.svg
          stem.svg
      README.md
  the-tone:
    type: audio
    src: /prism/fixtures/tone.wav
    caption: The tone it plays when the last line lands.
  the-loop:
    type: film
    src: /prism/fixtures/film.webm
    alt: The lines of the drawing appearing one after another
    poster: /images/lab/motion-path-graph.svg
    loop: true
    caption: The drawing, on a loop.
  the-take:
    type: film
    src: /prism/fixtures/film.webm
    caption: One take, from the first line to the last.
---

This experiment exists to show every block a page can be told with. It is written the way a real one is: prose here in the body, and a line naming each block where it belongs.

## How it began

It started as two drawings of the same thing.

::drawings

::redrawn

## Something live

Both of these load only when asked for.

::the-pen

::the-demo

## In three dimensions

::cube

::cloud

## How it was made

::in-my-words

::how

::the-trick

::files

## How it sounds and moves

::the-tone

::the-loop

The film that closes this page is not placed by the body, so it follows the prose.
