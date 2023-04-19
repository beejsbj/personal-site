export default function pageLoad(duration) {
  const params = new URL(document.location).searchParams;
  const page = params.get("page") ?? "home";

  if (page !== "home") {
    return;
  }

  const pageLoad = gsap.timeline();

  pageLoad
    .fromTo(
      "header .circle, .page-title, .page-title ~ .generic-text",
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: duration,
        stagger: duration / 1.25,
        ease: "expo.in",
        clearProps: "opacity",
      }
    )
    .fromTo(
      ".menus *",
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: duration,
        stagger: duration / 11,
        clearProps: "opacity",
      },
      ">"
    )
    .fromTo(
      "main section:not(.page-title, .page-title ~ .generic-text) *",
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: duration,
        stagger: duration / 30,
        clearProps: "opacity",
      },
      ">-1.6"
    );
}
