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

  function leaveAnimation(data) {
    const leaveTimeline = gsap.timeline();
    return leaveTimeline
      .to(".page-loader", {
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
      .to(data.current.container, {
        display: "none",
      });
  }

  function enterAnimation(data) {
    const enterTimeline = gsap.timeline();
    return enterTimeline

      .to(".page-loader", {
        backgroundColor: "var(--highlight)",
        duration: 0.5,
      })
      .to(".page-loader", {
        backgroundColor: "var(--color)",
        duration: 0.5,
      })
      .to(".page-loader .booming-voice", {
        display: "none",
        duration: 0.1,
        onComplete: function () {
          document.querySelector("html").innerHTML = data.next.html;
        },
      })
      .to(".page-loader", {
        height: "0",
        width: "0",
        borderRadius: "50%",
        duration: 0.5,
        ease: "expo.out",
      });
  }
}
