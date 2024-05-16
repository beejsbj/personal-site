import animateMagnet from "./animateMagnet.js";
import animateChapters from "./e4p-animations.js";
import pageLoad from "./pageLoad.js";
import pageTransition from "./pageTransition.js";
import scrollToEnd from "../scrollToEnd.js";
import scrollAnimation from "./scrollAnimation.js";

//

gsap.registerPlugin(ScrollTrigger);

//

scrollToEnd();
pageTransition();
pageLoad(0.5);
// scrollAnimation();

barba.hooks.beforeEnter((data) => {
  animateChapters();
});

// check if window is above 1000px
if (window.innerWidth > 1000) {
  animateMagnet();
}
