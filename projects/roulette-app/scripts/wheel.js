



var start = Date.now(); // remember start time
var i = Math.floor(Math.random() * 37);


function animations(){
	// how much time passed from the start?
	var timePassed = Date.now() - start;
	i++;
	if (i == 37) {
		i = 1;
	}
  

  if (timePassed >= 5000) {
    clearInterval(animations); // finish the animation after 2 seconds
    return;
  }



  // highlight the animation at the moment timePassed
  highlight(timePassed, i);
}



// as timePassed goes from 0 to 2000
// left gets values from 0px to 400px
function highlight(timePassed, i) {
	var sliceName = `svg #slice${i}`;
	var currentSlice = document.querySelector(sliceName);
	console.log(sliceName);

 	currentSlice.classList.toggle('selected');

	setTimeout(function () {
		currentSlice.classList.toggle('selected');
	}, 50);
}



setInterval(animations, 100);