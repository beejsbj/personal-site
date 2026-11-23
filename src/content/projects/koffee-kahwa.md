---
title: "Koffee & Kahwa"
summary: "Brand identity and spatial design for my family's café in Kashmir: the mark, the system, menu and print, the floor plan and the 3D model, all built from one generator."
year: 2026
dateLabel: "Sep 2026 – now"
role: "Design, concept and branding; spatial design and layout"
location: "Seelu, Sopore, Kashmir"
tools:
  - "Python"
  - "three.js"
  - "Astro"
  - "Claude"
  - "Codex"
  - "Gemini"
featured: true
status: "selected"
cover: "/images/projects/koffee-kahwa/cover.jpg"
links:
  - label: "Instagram"
    url: "https://www.instagram.com/koffeeandkahwa/"
media:
  - type: "image"
    src: "/images/projects/koffee-kahwa/model-front-dusk.webp"
    alt: "The café's 3D model from across the road at dusk: the deck, umbrellas, the pylon and the lit fascia."
    caption: "The café as designed: the 3D model from across the road, at dusk."
    width: 1600
    height: 900
journey:
  opening:
    art: "two-ks"
    line: "Two Ks, one chinar."
    caption: "A reversed K and a K, back to back, make a chinar leaf."
  label: "Koffee & Kahwa so far, from the first idea to the build"
  beats:
    - when: "Sep 2026"
      date: "2026-09"
      line: "Two bays, and the road."
      layout: "wide"
      media:
        - type: "image"
          src: "/images/projects/koffee-kahwa/shopfront-as-found.webp"
          alt: "The two-bay shop front as found: yellow roller shutters over glass, a bare concrete plinth, no people."
          caption: "The shop front as found in Seelu: two bays on a bare plinth."
          width: 1600
          height: 1200
      quotes:
        - text: "Like espresso shots in Kahwa cups."
          when: "26 Sep 2026"
    - when: "29 Sep 2026"
      date: "2026-09-29"
      line: "Koffee, with a K."
      layout: "wide"
      media:
        - type: "image"
          src: "/images/projects/koffee-kahwa/mark-construction.svg"
          alt: "Four steps: the Koffee K, the reversed Kahwa K, the two back to back, and the chinar leaf they make."
          caption: "K, reversed K, back to back, leaf."
          width: 2080
          height: 520
      quotes:
        - text: "lets go with Koffee and Kahwa. but lets use a modern graphic art of the back to back K and reverse K…"
          when: "29 Sep 2026"
    - when: "Oct – Nov 2026"
      date: "2026-10"
      line: "Every cup, one family."
      layout: "pair"
      media:
        - type: "image"
          src: "/images/projects/koffee-kahwa/lockup-horizontal.svg"
          alt: "The horizontal lockup: the leaf, the wordmark Koffee & Kahwa and its saffron ampersand."
          caption: "The lockup, and its one saffron ampersand."
          width: 352
          height: 88
          full: true
        - type: "image"
          src: "/images/projects/koffee-kahwa/menu-card-no-prices.webp"
          alt: "The A4 table menu: Koffee, Kahwa, Chai, Bakes and Savoury, every price a dash."
          caption: "The opening menu. Prices print as dashes until costed."
          width: 1140
          height: 1600
        - type: "image"
          src: "/images/projects/koffee-kahwa/sticker-sheet.webp"
          alt: "An A4 kiss-cut sticker sheet: leaf discs and the house lines, such as study hard, sip harder."
          caption: "Sticker sheet: the leaf and the house lines."
          width: 1140
          height: 1600
    - when: "Oct – Nov 2026"
      date: "2026-10"
      line: "One generator, every file."
      layout: "pair"
      code:
        caption: "How the generator draws the lockup: the proportions locked on the deck, kept as Python."
        text: |
          def lockup_h(x, y, size, words=None, amp=None, left=None, right=None, solid=None):
              """Horizontal lockup: leaf, then wordmark, top-left at (x, y). size = word size.
              Proportions from deck slide 1 (locked): leaf = 2.2x word size, gap = 0.46x,
              wordmark caps centred on the leaf. Returns (svg, w, h)."""
              mh = 2.2 * size
              m, mw = mark(x, y, mh, left, right, solid)
              base = y + mh * 0.5 + cap(size) * 0.5
              wm, ww = wordmark(x + mw + 0.46 * size, base, size, words, amp)
              return m + wm, mw + 0.46 * size + ww, mh
      media:
        - type: "image"
          src: "/images/projects/koffee-kahwa/everything-the-generator-made.webp"
          alt: "A grid of 132 brand files: marks, lockups, menus, packaging, signs, posters, social tiles, stickers, merch and paper."
          caption: "132 of the files it has made: marks, menus, signs, posters, stickers."
          width: 2000
          height: 1826
          full: true
        - type: "image"
          src: "/images/projects/koffee-kahwa/deck-slide-08-colour-type.webp"
          alt: "Deck slide: the colours as a ratio bar, cream, walnut, saffron, pink, chinar, pine and lapis, and the three type roles."
          caption: "Warm base, rare accents: colour in ratio, three typefaces."
          width: 1600
          height: 900
        - type: "image"
          src: "/images/projects/koffee-kahwa/deck-slide-09-voice.webp"
          alt: "Deck slide: the house lines set as stickers on pink."
          caption: "Proud, not preachy: the house lines, one joke per object."
          width: 1600
          height: 900
    - when: "Oct – Nov 2026"
      date: "2026-11"
      line: "The café grows toward the road."
      layout: "pair"
      media:
        - type: "video"
          src: "/images/projects/koffee-kahwa/model-walkthrough.mp4"
          poster: "/images/projects/koffee-kahwa/model-walkthrough-poster.webp"
          alt: "A walk through the 3D model: across the road, up the steps, along the deck and through the door to the counter."
          caption: "Road to counter in seventeen seconds, in the 3D model."
          width: 1280
          height: 720
          full: true
        - type: "image"
          src: "/images/projects/koffee-kahwa/plan-ga-inside.webp"
          alt: "The ground-floor plan at 1:25 with seat counts and the reasons for each choice; the deck begins at the bottom."
          caption: "The chosen plan: 15 seats inside, 24 on the deck."
          width: 2000
          height: 1190
          full: true
        - type: "image"
          src: "/images/projects/koffee-kahwa/sheet-velvet-booth.webp"
          alt: "Furniture sheet for the velvet booth, its tables and armchairs: plan, section, elevation and a make list."
          caption: "The velvet booth, drawn to build."
          width: 2000
          height: 1350
        - type: "image"
          src: "/images/projects/koffee-kahwa/sheet-window-bar.webp"
          alt: "Furniture sheet for the walnut window bar on steel legs and its cane stools."
          caption: "Window bar and cane stools, a socket per stool."
          width: 2000
          height: 1350
      quotes:
        - text: "having multiple options is distracting, lets keep one thing."
          when: "9 Nov 2026"
    - when: "Sep – Nov 2026"
      date: "2026-11"
      line: "Not now. Not never."
      note: "AI renders were briefs for the eye, each kept with its prompt and its verdict. None of them is the real place."
      layout: "pair"
      media:
        - type: "image"
          src: "/images/projects/koffee-kahwa/ai-kangri-one-handle-rejected.webp"
          alt: "AI render of a kangri lamp that reads as having one handle."
          caption: "Attempt 1, rejected: one handle. A real kangri has two."
          width: 1376
          height: 768
        - type: "image"
          src: "/images/projects/koffee-kahwa/ai-kangri-two-arches-kept.webp"
          alt: "AI render of a kangri lamp with two woven arches and a filament bulb in the clay pot."
          caption: "Attempt 3, kept: two handles, a filament bulb in the clay."
          width: 1376
          height: 768
      quotes:
        - text: "i see that many of the indoor pictures also still have the raw concrete vibe. which i feel makes it feel like a warehouse."
          when: "29 Sep 2026"
      turns:
        - when: "12 Oct 2026"
          from: "No shutters: a new front and a sign"
          to: "The shutters stay, repaired and redesigned"
        - when: "12 Oct 2026"
          from: "Four logo variants up for a vote, neon among them"
          to: "The split leaf only; neon dropped everywhere"
        - when: "12 Oct 2026"
          from: "Kulcha off the menu"
          to: "Kandur kulcha back for the traditionalists"
        - when: "12 Oct 2026"
          from: "A roof terrace with a spiral stair"
          to: "Roof paused; a deck out to the road instead"
        - when: "13 Oct 2026"
          from: "Four voting decks with Love, Maybe and No buttons"
          to: "One definitive deck, and no votes"
        - when: "14 Oct 2026"
          from: "A washroom on the deck"
          to: "Off the plan"
        - when: "14 Oct 2026"
          from: "A bento-cake box and its sticker"
          to: "Bento dropped"
    - when: "Now"
      date: "2026-11"
      line: "Now, the deck goes in."
      layout: "pair"
      media:
        - type: "image"
          src: "/images/projects/koffee-kahwa/model-deck-wide.webp"
          alt: "The 3D model on the deck: two-tops and cane chairs under kangri lamps, the glass front behind."
          caption: "Drawn: the deck in the 3D model."
          width: 1600
          height: 678
        - type: "image"
          src: "/images/projects/koffee-kahwa/platform-edge-cast.webp"
          alt: "The platform's edge cast all round, stones heaped inside and concrete rings waiting in front."
          caption: "Built so far: the deck's edge, cast all round, 13 November."
          width: 1598
          height: 678
        - type: "image"
          src: "/images/projects/koffee-kahwa/footing-corner.webp"
          alt: "The deck footing's corner: stone set in a trench with a steel mesh."
          caption: "The footing's corner: stone and mesh in the trench."
          width: 1050
          height: 1400
        - type: "image"
          src: "/images/projects/koffee-kahwa/rcc-beam-poured.webp"
          alt: "The concrete edge beam freshly poured in its timber shuttering."
          caption: "The edge beam, poured in its shuttering."
          width: 898
          height: 1278
      quotes:
        - text: "No, we won't cast it into the deck, that's too permanent."
          when: "21 Nov 2026"
      turns:
        - when: "21 Nov 2026"
          from: "Umbrella sleeves cast into the deck"
          to: "Loose weighted bases"
  open:
    line: "hamin ast-o, hamin ast-o, hamin ast."
    note: "It is this, it is this, it is this: the deck's last line. 58 days in, the café isn't open yet."
order: 0
tags:
  - "client"
hidden: false
---

A café in Kashmir that I'm designing for my family. My cousins run the business and lead the build. The name, the mark, the system and the room are mine, made with agents, and every decision is dated below.
