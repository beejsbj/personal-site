//

// const $siteMenu = document.querySelectorAll("header .site-menu a");
// const $headerCircle = document.querySelector("header .circle");
// $siteMenu.forEach(function (item) {
//   item.addEventListener("click", function (e) {
//     console.log(e);
//     $headerCircle.style.setProperty("--top", e.target.offsetTop + "px");
//     $headerCircle.style.setProperty("--right", e.target.offsetRight + "px");
//   });
// });

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
