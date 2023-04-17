import animateMagnet from "./animateMagnet.js";
import animateChapters from "./e4p-animations.js";
import pageLoad from "./pageLoad.js";
import pageTransition from "./pageTransition.js";
import scrollToEnd from "../scrollToEnd.js";

//

gsap.registerPlugin(ScrollTrigger);

//

scrollToEnd();
pageTransition();
animateChapters();
pageLoad();

// check if window is above 1000px
if (window.innerWidth > 1000) {
  animateMagnet();
}
