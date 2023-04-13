export default function chapter2SVG() {
  gsap.registerPlugin(ScrollTrigger);

  const chapter = gsap.timeline({
    ScrollTrigger: {
      trigger: "#chapter2",
      toggleActions: "restart none none none",
      markers: true,
      start: "top center",
    },
  });

  chapter.fromTo(
    "#chapter2 #minus path",
    {
      rotate: 0,
      transformOrigin: "50% 50%",
    },
    {
      rotate: 360,
      duration: 1,
      ease: "linear",
      stagger: {
        //  each: 0.3,
        repeat: 1,
      },
    }
  );
}
