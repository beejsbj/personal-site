export default function pageTransition() {
  gsap.registerPlugin(MotionPathPlugin);

  barba.init({
    transitions: [
      {
        name: "color-transition",
        leave(data) {
          return leaveAnimation(data);
        },
        enter(data) {
          return enterAnimation(data);
        },
      },
    ],
  });

  //   barba.hooks.beforeEnter((data) => {
  //     document.querySelector("html").innerHTML = data.next.html;
  //   });

  const $pageLoader = document.querySelector(".page-loader");
  $pageLoader.innerHTML = `
    <div class="red"></div>
    <div class="orange"></div>
		<div class="yellow"></div>
	 <div class="green"></div>
	 <div class="cyan"></div>
	 <div class="blue"></div>
	 <div class="purple"></div>
	 <div class="red"></div>
    <div class="orange"></div>
		<div class="yellow"></div>
	 <div class="green"></div>
	 <div class="cyan"></div>
	 <div class="blue"></div>
	 <div class="purple"></div>
	 `;

  function leaveAnimation(data) {
    //

    const leaveTimeline = gsap.timeline();
    return leaveTimeline
      .set(".page-loader", {
        width: "100vw",
      })
      .set(".page-loader div", {
        x: "100%",
      })
      .to(".page-loader div", {
        x: "0%",
        duration: 1,

        stagger: {
          from: "end",
          each: 0.1,
          ease: "circ.out",
        },
        onComplete: function () {
          // create element from next html string
          const parser = new DOMParser();
          const nextDoc = parser.parseFromString(data.next.html, "text/html");

          const $htmlClass = nextDoc.querySelector("html").classList;
          const $head = nextDoc.querySelector("head");
          const $header = nextDoc.querySelector("header");
          const $main = nextDoc.querySelector("main");
          const $footer = nextDoc.querySelector("footer");

          document.querySelector("html").classList = $htmlClass;
          document.querySelector("head").innerHTML = $head.innerHTML;
          document.querySelector("header").innerHTML = $header.innerHTML;
          document.querySelector("main").innerHTML = $main.innerHTML;
          document.querySelector("footer").innerHTML = $footer.innerHTML;
        },
      })
      .to(data.current.container, {
        duration: 0.01,
        display: "none",
      });
  }

  function enterAnimation(data) {
    const enterTimeline = gsap.timeline();
    return enterTimeline
      .to(".page-loader div", {
        x: "-100%",
        duration: 1,
        stagger: {
          from: "end",
          each: 0.1,
          //   ease: "power2.in",
        },
      })
      .to(".page-loader", {
        width: "0",
        duration: 0.01,
      });
  }
}
