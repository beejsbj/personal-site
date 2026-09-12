---
title: "Flash Cards"
summary: "Our JavaScript app project. This idea came about after spending a lot of time with SuperMemo: a spaced-repetition study tool for the PE Study Hall question bank."
year: 2022
dateLabel: "Nov 2022"
role: "Design & Development"
location: "Perpetual Education"
tools: ["JavaScript", "HTML", "CSS"]
featured: false
status: "archive"
cover: "/images/projects/flashcards.png"
links:
  - label: "Explore the source"
    url: "https://github.com/beejsbj/pe-projects/tree/main/projects/flashcards"
media:
  - type: "image"
    src: "/images/projects/flashcards.png"
    alt: "Flash Cards study app interface"
    width: 2000
    height: 1287
order: 2
tags: ["student-work", "learning-tools"]
---

## From SuperMemo to a study tool

This idea came about after spending a lot of time with SuperMemo. For our JavaScript app project at Perpetual Education, I wanted to make a tool that could help students review what they were learning.

The app fetches questions and answers from the PE Study Hall question bank. I designed a simple spaced-repetition system with four review intervals: 1, 3, 7, and 14 days. Remember an answer and the card moves forward; miss it and it returns to an earlier interval.

## What I worked on

- Building the app in vanilla JavaScript, using classes and data fetched from an API.
- Designing the frontend and mapping the interactions across its different views.
- Building the review logic and storing previous attempts in local storage.

The interface takes its cues from Perpetual Education so that the study tool feels connected to the material it draws from. This is a student project preserved through its screenshot and source, not a currently maintained study service.
