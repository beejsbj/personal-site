import pageTransition from "./pageTransition.js";

pageTransition();

let $circle = document.querySelector(".circle");
$circle.onclick = (e) => {
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
};
