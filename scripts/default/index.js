import animateMagnet from "./animateMagnet.js";
import animateChapters from "./e4p-animations.js";
import pageLoad from "./pageLoad.js";
import pageTransition from "./pageTransition.js";
import scrollToEnd from "../scrollToEnd.js";
import scrollAnimation from "./scrollAnimation.js";

import Swup from "https://unpkg.com/swup@4?module";
import SwupHeadPlugin from "https://unpkg.com/@swup/head-plugin@2?module";
import SwupBodyClassPlugin from "https://unpkg.com/@swup/body-class-plugin@3?module";
import SwupParallelPlugin from "https://unpkg.com/@swup/parallel-plugin@0?module";

const swup = new Swup({
  animateHistoryBrowsing: true,
  plugins: [
    new SwupHeadPlugin(),
    new SwupBodyClassPlugin(),
    new SwupParallelPlugin(),
  ],
});

swup.hooks.on("visit:start", (context) => {
  let x = 0.5;
  let y = 0.5;
  const event = context.trigger.event;

  if (event && typeof event.clientX === "number") {
    const target = event.target;
    const rect = target.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
    console.log(x, y);
    //  x = event.clientX / window.innerWidth;
    //  y = event.clientY / window.innerHeight;
  }
  document.documentElement.style.setProperty("--click-x", x);
  document.documentElement.style.setProperty("--click-y", y);
});

//

gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(MotionPathPlugin);

//

scrollToEnd();
// pageTransition();
// pageLoad(0.5);
// scrollAnimation();

// barba.hooks.beforeEnter((data) => {
//   animateChapters();
// });

// check if window is above 1000px
if (window.innerWidth > 1000) {
  animateMagnet();
}
