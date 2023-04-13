import animateMagnet from "./animateMagnet.js";
import animateChapters from "./e4p-animations.js";

// check if window is above 1000px
if (window.innerWidth > 1000) {
  animateMagnet();
}
animateChapters();

gsap.registerPlugin(ScrollTrigger);

gsap.fromTo(
  "header * , main *, footer *",
  {
    opacity: 0,
  },
  {
    opacity: 1,
    duration: 0.5,
    stagger: 0.5 / 40,
    ease: "power2.in",
    clearProps: "opacity",
    //  scrollTrigger: {
    //    trigger: "main",
    //    start: "top center",
    //    toggleActions: "play reset none none",
    //    end: "max - 100px",
    //    scrub: true,
    //    markers: true,
    //  },
  }
);
