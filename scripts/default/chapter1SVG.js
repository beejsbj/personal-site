export default function chapter1SVG() {
  gsap.registerPlugin(ScrollTrigger);

  const chapter = gsap.timeline({
    ScrollTrigger: {
      trigger: "#chapter1",
      toggleActions: "restart none none none",
      markers: true,
      start: "top center",
    },
  });

  chapter
    .fromTo(
      "#chapter1 #input > path",
      {
        strokeDashoffset: 1000,
        strokeDasharray: 1000,
      },
      {
        duration: 1,
        strokeDashoffset: 0,
        ease: "power2.inOut",
      }
    )
    .fromTo(
      "#chapter1 #gears path",
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
    )
    .fromTo(
      "#chapter1 #output > path",
      {
        strokeDashoffset: 1000,
        strokeDasharray: 1000,
      },
      {
        duration: 1,
        strokeDashoffset: 2000,
        ease: "power2.inOut",
      }
    );
}
