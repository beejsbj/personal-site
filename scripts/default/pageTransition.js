export default function pageTransition() {
  //   return;
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

  function leaveAnimation(data) {
    //
    let bodyRect = document.body.getBoundingClientRect();
    let elemRect = data.trigger.getBoundingClientRect();
    //  get center of the element
    let triggerX = elemRect.left - bodyRect.left + elemRect.width / 2;
    let triggerY = elemRect.top - bodyRect.top + elemRect.height / 2;

    const leaveTimeline = gsap.timeline();
    return leaveTimeline
      .set(".page-loader", {
        y: triggerY,
        x: triggerX,
        height: "50px",
        width: "50px",
        opacity: 1,
      })
      .to(".page-loader", {
        motionPath: {
          path: [
            {
              x: triggerX,
              y: triggerY,
            },
            {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            },
          ],
          //  fromCurrent: false,
          curviness: 3,
        },
        opacity: 1,
        duration: 0.5,
        ease: "elastic.out(0.2, 0.3)",
      })
      .to(".page-loader", {
        x: "-50vw",
        y: "-50vh",

        height: "200vh",
        width: "200vw",

        duration: 0.3,
        ease: "expo.in",
      })
      .to(".page-loader", {
        borderRadius: "0",
        duration: 0.01,
      })
      .to(".page-loader .booming-voice", {
        display: "block",
        color: "var(--paper)",
        onStart: function () {
          this.targets()[0].innerHTML = data.trigger.innerHTML;
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
        duration: 0.01,
        display: "none",
      });
  }

  function enterAnimation(data) {
    let bodyRect = document.body.getBoundingClientRect();
    let elemRect = data.trigger.getBoundingClientRect();
    let triggerX = elemRect.left - bodyRect.left + elemRect.width / 2;
    let triggerY = elemRect.top - bodyRect.top + elemRect.height / 2;

    const enterTimeline = gsap.timeline();
    return enterTimeline

      .to(".page-loader .booming-voice", {
        display: "none",
        duration: 0.01,
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
        x: triggerX,
        y: triggerY,
        height: "0",
        width: "0",
        borderRadius: "50%",
        duration: 0.3,
        ease: "expo.out",
        clearProps: "all",
      });
  }
}
