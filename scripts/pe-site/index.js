import pageTransition from "./pageTransition.js";
import scrollToEnd from "../scrollToEnd.js";
import Swup from "https://unpkg.com/swup@4?module";
import SwupHeadPlugin from "https://unpkg.com/@swup/head-plugin@2?module";
import SwupBodyClassPlugin from "https://unpkg.com/@swup/body-class-plugin@3?module";

const swup = new Swup({
  animateHistoryBrowsing: true,
  plugins: [new SwupHeadPlugin(), new SwupBodyClassPlugin()],
});

// gsap.registerPlugin(ScrollTrigger);
// gsap.registerPlugin(MotionPathPlugin);

// swup.hooks.replace("animation:out:await", async () => {
//   await gsap.to("#swup", { opacity: 0, duration: 0.25 });
// });

// swup.hooks.replace('animation:in:await', async () => {
// 	await gsap.fromTo('.transition-fade', { opacity: 0 }, { opacity: 1, duration: 0.25 });
//  });

//
pageTransition(swup);
scrollToEnd();
