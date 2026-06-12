---
title: "QRNG Demo Apps"
summary: "The Lottery App and Roulette App were demo projects developed to showcase the true randomness of QRNG (Quantum Random Number Generation). I was given creative freedom to design and implement these apps, allowing me to explore bold aesthetics, interactive elements, and cutting-edge technologies. Originally built in vanilla JavaScript, both projects were later ported to React for seamless integration with Web3 and blockchain functionalities."
year: 2022
dateLabel: "Sep 2022"
role: "Design & Development"
location: "Remote @API3"
tools:
  - "HTML"
  - "CSS"
  - "JS"
  - "React"
featured: true
status: "selected"
cover: "/images/projects/lottery-app.jpg"
links:
  -
    label: "Demo Lottery"
    url: "https://demo-lottery.netlify.app/"
  -
    label: "Demo Roullete"
    url: "https://demo-roulette-api3.netlify.app"
  -
    label: "Github"
    url: "https://github.com/beejsbj/qrng-roulette"
media:
  -
    type: "image"
    src: "/images/projects/lottery-app.jpg"
    alt: "QRNG Demo Apps cover image"
order: 4
tags:
  - "api3"
hidden: false
---

## Goals

- Showcase the true randomness of Quantum Random Number Generation (QRNG) through interactive demo applications.
- Design and implement engaging, themed user interfaces for both apps, utilizing CSS animations and SVG elements to enhance user experience.
- Integrate Web3 functionality via Metamask for user interaction and enable blockchain-driven features.
- Develop reusable, responsive components in React for better scalability and maintainability across devices.

## Lottery App

Inspired by the dynamic aesthetic of Persona 5, a favorite game of mine, the Lottery App was designed to be a bold, engaging experience. Users can either manually select five numbers from 1 to 50 or opt for a randomly generated set. The app also allows users to choose the number of entries they’d like, all of which are then linked to a smart contract via Metamask. The smart contract holds entries for a week before selecting a winner and distributing the winnings.

## Key Features:

- Number Selection & Random Generation: Users can select their numbers or use a random number generator.
- Metamask Integration: This allows users to connect their wallets and securely submit their entries, which are then processed on the blockchain.
- Countdown Timer: Using a customized countdown package, I styled it with CSS to match the app’s theme and provide a visual countdown to the winner announcement.
- CSS Animations: To bring the app to life, I used extensive CSS animations that animate different elements, making the user experience visually captivating.

## Roulette App

The Roulette App takes inspiration from a “hole-in-the-wall” bar with vibrant neon lighting throughout the interface. This app provides an immersive experience where users can spin a digital roulette wheel, visually represented with SVG and animated with JavaScript. Built with the same intent of showcasing QRNG’s randomness, this app gives users a lively, interactive way to engage with quantum-based randomness.

## Key Features:

- SVG-Based Roulette Wheel: The wheel was crafted in SVG, allowing for clean, scalable graphics that integrate seamlessly with the app’s aesthetics.
- JavaScript-Powered Interactions: The spinning functionality was implemented with JavaScript, creating a smooth, interactive experience for users.
- Themed Design with Neon Lighting: CSS animations and custom styles create an atmospheric experience, reflecting the theme of a neon-lit bar.

## Challenges and Solutions

Challenge - Implementing Metamask Integration: Integrating Metamask for user authentication and transaction handling required research and testing to ensure security and ease of use. I overcame this by using Web3 libraries and closely following blockchain security best practices.

Challenge - Designing Engaging, Responsive Animations: Bringing both apps to life through animations and interactivity was essential. I solved this by creating CSS animations and using JavaScript to dynamically control elements like the SVG wheel spin.

Solution - Using SVG for Smooth Graphics: I implemented the roulette wheel with SVG, which allowed for clean, scalable visuals and integrated seamlessly with JavaScript interactions for a polished, immersive user experience.

## Learning Outcomes

Web3 and Blockchain Integration: This project provided hands-on experience with Web3 technologies, particularly in handling blockchain transactions and secure user authentication with Metamask.

Advanced CSS and JavaScript Animation Techniques: Creating interactive, animated components across both apps expanded my skills in CSS animations and JavaScript-based interactions, enhancing the user experience.

Designing Themed User Interfaces: Through the Persona 5-inspired aesthetic of the Lottery App and the neon theme of the Roulette App, I learned how to create cohesive, engaging themes that reinforce the brand and functionality of an application.

## Final Thoughts

The QRNG demo projects allowed me to combine creativity with technical depth, from integrating Web3 and blockchain features to developing visually immersive, animated interfaces. These apps demonstrate how design and technology can converge to create engaging and functional user experiences.
