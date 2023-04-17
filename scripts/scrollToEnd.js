export default function scrollToEnd() {
  let $circles = document.querySelectorAll(":is(header, footer) .circle");
  $circles.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.scrollY > 0) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      } else {
        //scroll to bottom
        window.scrollTo({
          top: document.body.scrollHeight,
          left: 0,
          behavior: "smooth",
        });
      }
    });
  });
}
