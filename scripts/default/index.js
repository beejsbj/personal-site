import animateMagnet from "./animateMagnet.js";
import animateChapters from "./e4p-animations.js";
import pageLoad from "./pageLoad.js";
import pageTransition from "./pageTransition.js";

// check if window is above 1000px
if (window.innerWidth > 1000) {
  animateMagnet();
}

pageTransition();

animateChapters();

gsap.registerPlugin(ScrollTrigger);

const params = new URL(document.location).searchParams;
const page = params.get("page");

if (page === "home") {
  pageLoad(0.5);
}

// let $circle = document.querySelector(".circle");
// $circle.onclick = (e) => {
//   e.preventDefault();
//   window.scrollTo({
//     top: 0,
//     left: 0,
//     behavior: "smooth",
//   });
// };
