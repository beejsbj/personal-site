export default function pageTransition() {
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
        top: top,
        left: left,
        height: "50px",
        width: "50px",
      })
      .to(".page-loader", {
        opacity: 1,

        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        duration: 1,
        ease: "elastic.out(0.5, 0.35)",
      })
      .to(".page-loader", {
        height: "100vh",
        width: "100vw",
        borderRadius: "0",
        duration: 0.5,
        ease: "expo.in",
      })
      .to(".page-loader", {
        backgroundColor: "var(--highlight)",
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
      .to(data.current.container, {
        duration: 0.5,
        display: "none",
      });
  }

  function enterAnimation(data) {
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
