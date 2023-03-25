// check if window is above 1000px
if (window.innerWidth > 1000) {
  animateIndividualMagnetic();
}

//functions

function animateIndividualMagnetic() {
  let children = document.querySelectorAll(".default-theme .site-menu a");

  children.forEach(function (child) {
    let span = child.querySelector("span");

    child.addEventListener("mouseenter", function (event) {
      gsap.to(this, {
        duration: 0.3,
      });

      gsap.to(span, {
        duration: 0.3,
        x: 0,
        y: 0,
        scale: 0.85,
      });
    });

    child.addEventListener("mousemove", function (e) {
      callParallax(e, child);
    });

    child.addEventListener("mouseleave", function (e) {
      gsap.to(child, {
        duration: 0.3,
        x: 0,
        y: 0,
        ease: "elastic.out(0.7, 0.4)",
      });

      gsap.to(span, {
        duration: 0.4,
        x: 0,
        y: 0,
        scale: 1,
        ease: "elastic.out(0.7, 0.4)",
      });
    });
  });

  function callParallax(e, child) {
    parallaxIt(e, child, 70);

    let span = child.querySelector("span");
    parallaxIt(e, span, 20);
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
