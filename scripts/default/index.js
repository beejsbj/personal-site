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

let $circles = document.querySelectorAll(":is(header, footer) .circle");
$circles.forEach(function (item) {
  item.addEventListener("click", function (e) {
    e.preventDefault();
    if (window.scrollY > 0) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    } else {
      //scroll to bottom
      window.scrollTo({
        top: document.body.scrollHeight,
        left: 0,
        behavior: "smooth",
      });
    }
  });
});
