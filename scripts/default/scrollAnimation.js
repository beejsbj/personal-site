export default function scrollAnimation() {
  let $circle = document.querySelector("header svg.circle");

  console.log($circle);
  //   gsap scrolltrigger move circle to bottom

  const timeline = gsap.timeline();

  timeline.to($circle, {
    scrollTrigger: {
      trigger: "home-section.one",
      scrub: true,
      start: "top top",
      end: "bottom top",
      markers: true,
    },
    top: "1000px",
    left: "500px",
    width: 10,
    duration: 1,
    zIndex: -3,
  });
}
