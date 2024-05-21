export default function pageTransition(swup) {
  swup.hooks.replace("animation:in:await", async () => {
    await enter();
  });

  swup.hooks.replace("animation:out:await", async () => {
    await leave();
  });

  function addLoader() {
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
  }
  async function leave() {
    addLoader();
    const leaveTimeline = gsap.timeline();
    await leaveTimeline
      .set(".page-loader", {
        width: "100vw",
      })
      .set(".page-loader div", {
        x: "100%",
      })
      .to(".page-loader div", {
        x: "0%",
        duration: 0.5,

        stagger: {
          from: "end",
          each: 0.05,
          ease: "circ.out",
        },
      });
  }

  async function enter() {
    addLoader();
    const enterTimeline = gsap.timeline();
    await enterTimeline
      .to(".page-loader div", {
        x: "-100%",
        duration: 0.5,
        stagger: {
          from: "end",
          each: 0.05,
          //   ease: "power2.in",
        },
      })
      .to(".page-loader", {
        width: "0",
        duration: 0.01,
      });
  }
}
