export default function animateMagnet() {
  let magnets = document.querySelectorAll(".magnetic:not(:has(.magnetic))");

  magnets.forEach(function (magnet) {
    let child = magnet.querySelector("*");

    magnet.addEventListener("mouseenter", function (event) {
      gsap.to(this, {
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(child, {
        duration: 0.4,
        x: 0,
        y: 0,
        scale: 0.9,
        ease: "elastic.out(0.7, 0.4)",
      });
    });

    magnet.addEventListener("mousemove", function (e) {
      callParallax(e, magnet);
    });

    magnet.addEventListener("mouseleave", function (e) {
      gsap.to(magnet, {
        duration: 0.3,
        x: 0,
        y: 0,
        ease: "elastic.out(0.7, 0.4)",
      });

      gsap.to(child, {
        duration: 0.4,
        x: 0,
        y: 0,
        scale: 1,
        ease: "elastic.out(0.7, 0.4)",
      });
    });
  });

  function callParallax(e, magnet) {
    parallaxIt(e, magnet, 40);

    let child = magnet.querySelector("*");
    parallaxIt(e, child, 20);
  }

  function parallaxIt(e, target, movement) {
    let boundingRect = target.getBoundingClientRect();
    //  console.log(e);
    let relX = e.clientX - boundingRect.left;
    let relY = e.clientY - boundingRect.top;

    gsap.to(target, {
      duration: 0.3,
      x: ((relX - boundingRect.width / 2) / boundingRect.width) * movement,
      y: ((relY - boundingRect.height / 2) / boundingRect.width) * movement,
      ease: "power2.out",
    });
  }
}
