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

  function leaveAnimation(data) {
    //
    let bodyRect = document.body.getBoundingClientRect();
    let elemRect = data.trigger.getBoundingClientRect();
    let top = elemRect.top - bodyRect.top;
    let left = elemRect.left - bodyRect.left;

    console.log(top, left);

    const leaveTimeline = gsap.timeline();
    return leaveTimeline
      .set(".page-loader", {
        y: top,
        x: left,
        height: "50px",
        width: "50px",
        opacity: 1,
      })
      .to(".page-loader", {
        motionPath: {
          path: [
            { x: left, y: top },
            { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          ],
          fromCurrent: false,
          curviness: 3,
        },
        opacity: 1,
        duration: 0.5,
        ease: "elastic.out(0.2, 0.3)",
      })

      .to(".page-loader", {
        x: 0,
        y: 0,
        height: "100vh",
        width: "100vw",
        borderRadius: "0",
        duration: 0.5,
        ease: "expo.in",
      })

      .to(".page-loader .booming-voice", {
        display: "block",
        color: "var(--paper)",
        onComplete: function () {
          this.targets()[0].innerHTML = data.next.namespace;
          window.scrollTo({
            top: 0,
            left: 0,
          });
        },
      })
      .to(".page-loader", {
        backgroundColor: "var(--highlight)",
        ease: "expo.out",
      })
      .to(data.current.container, {
        duration: 0.5,
        display: "none",
      });
  }

  function enterAnimation(data) {
    let bodyRect = document.body.getBoundingClientRect();
    let elemRect = data.trigger.getBoundingClientRect();
    let top = elemRect.top - bodyRect.top;
    let left = elemRect.left - bodyRect.left;

    const enterTimeline = gsap.timeline();
    return enterTimeline

      .to(".page-loader .booming-voice", {
        display: "none",
        duration: 0.1,
        onComplete: function () {
          //  console.log(data.next);
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
      .to(".page-loader", {
        x: left,
        y: top,
        height: "0",
        width: "0",
        borderRadius: "50%",
        duration: 0.5,
        //   opacity: 0,

        ease: "expo.out",
        clearProps: "all",
      });
  }
}
