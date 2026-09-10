---
title: "Flash Cards"
summary: "Our Javascript app project, This idea came about after spending a lot of time with supermemo."
type: "app experiment"
sourceEra: "Student work"
cover: "/images/projects/flashcards.png"
links:
  -
    label: "Source"
    url: "https://github.com/beejsbj/pe-projects/tree/main/projects/flashcards"
media:
  -
    type: "image"
    src: "/images/projects/flashcards.png"
    alt: "Flash Cards cover image"
    width: 2000
    height: 1287
order: 3
hidden: false
---

## Overview

This Flash Card app was a JavaScript project assignment from Perpetual Education. At the time, I was interested in the concept of spaced repetition and wanted to create a tool that could aid students in learning. The app fetches questions and answers directly from the PE Study Hall question bank, giving users a personalized and interactive learning experience. I designed a simple spaced repetition system using four review intervals: 1 day, 3 days, 7 days, and 14 days. If users remember an answer, the card progresses to the next review interval; if not, it moves to an earlier interval, reinforcing learning over time.

## Goals

- Build out a Flashcard app with vanilla JS, using Classes and data fetched from an API
- Design the Frontend and map out how the interactions will flow through all page faces
- Build out the logic for the interactions
- Account for the User's history and store their previous attempts(local storage)

## Key Features:

- Integrated with the PE Study Hall question bank to pull real questions and answers for student review.
- Custom-built spaced repetition system using four intervals (1, 3, 7, and 14 days) to optimize retention based on user performance.
- Simple, PE-inspired design that reflects the aesthetic of the Perpetual Education website.

## Challenges and Solutions

Challenge - Creating an Effective Spaced Repetition System: Building a spaced repetition algorithm required a solid understanding of how learning intervals impact retention. I solved this by implementing a simplified interval system, with cards moving forward or backward based on user performance.

Challenge - Integrating with the PE Study Hall Database: Pulling content directly from the PE question bank presented technical challenges. I used JavaScript to fetch and display the data dynamically, creating a seamless learning experience for users.

Solution - Streamlined Design with PE Aesthetic: I wanted the app to feel like an extension of the PE site. By mirroring the minimalist style of PE, I created a cohesive design that blends smoothly with the broader PE ecosystem.

## Learning Outcomes

Applying Spaced Repetition Theory in Practice: This project deepened my understanding of spaced repetition as a learning method and gave me the chance to implement it in a practical application.

Database Integration and Data Fetching: Integrating with the PE question bank helped me learn to work with external data sources, fetching and displaying data dynamically with JavaScript.

User-Focused Interactive Design: Creating an interactive learning tool taught me to think from the user's perspective, focusing on simplicity, accessibility, and the overall learning experience.

## Final Thoughts

Building the Flash Cards app was a rewarding experience that combined my interest in spaced repetition with the chance to develop a useful educational tool. This project reinforced my belief in the power of interactive, personalized learning experiences and gave me valuable insights into designing tools that help users retain knowledge effectively.
