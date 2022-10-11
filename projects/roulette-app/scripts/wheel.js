const spinTime = 5000;
var frameTime = 150;
const blueNums = [3, 32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12];

function wheelStrokeColor(i) {
	var allStrokes = document.querySelectorAll('#color-slices path');
	if (blueNums.includes(i)) {
		allStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--blue)";
		})
	} else {
		allStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--red)";
		})
	}
}

function animations(start) {
	
	// how much time passed from the start?
	var timePassed = Date.now() - start;
	if (timePassed >= spinTime) {
		clearInterval(animations); // finish the animation after 2 seconds
		return;
	}
	var i = Math.floor(Math.random() * 37);
	i++;
	if (i == 37) {
		i = 1;
	}
	// highlight the animation at the moment timePassed
	highlight(timePassed, i);
}
// as timePassed goes from 0 to frameTime0
// left gets values from 0px to 400px
function highlight(timePassed, i) {
	wheelStrokeColor(i);
	var whiteSliceName = `#white-slices #slice-${i}`;
	var colorSliceName = `#color-slices #slice-${i}-color`;
	var currentWhiteSlice = document.querySelector(whiteSliceName);
	var currentColorSlice = document.querySelector(colorSliceName);
	// console.log(i);
	currentWhiteSlice.classList.toggle('selected');
	currentColorSlice.classList.toggle('selected');

	

	if (timePassed < (spinTime - frameTime)) {
		setTimeout(function() {
			currentWhiteSlice.classList.toggle('selected');
			currentColorSlice.classList.toggle('selected');
		}, frameTime);
	}
}

var spinButton = document.querySelector('button#spin');
spinButton.addEventListener("click", function() {
	removeSLiceClass();
	var start = Date.now(); // remember start time
	setInterval(animations, frameTime, start);
});



function removeSLiceClass() {
	var selectedSlices = document.querySelectorAll(".selected");

	selectedSlices.forEach(function(slice) {
		// console.log(slice);
		slice.classList.remove("selected");
		// console.log(slice);
	})
}




//number chart styling




blueNums.forEach( function(blueNum) {
	var blueCheckbox = document.querySelector(`#num-${blueNum} + label`);
	blueCheckbox.style.borderColor = "var(--blue)";
	blueCheckbox.style.boxShadow = "0px 0px 5px var(--blue)";
})






//animation flicker

var titleSign = document.querySelector(`h1 path:nth-of-type(${Math.floor(Math.random() * 8) + 1})`)
titleSign.classList.add('flicker-animation');

var titleSign2 = document.querySelector(`h1 path:nth-of-type(${Math.floor(Math.random() * 8) + 1})`)
titleSign2.classList.add('flicker-animation2');

var spinSign = document.querySelector(`#back-spin path:nth-of-type(${Math.floor(Math.random() * 4) + 1})`)
spinSign.classList.add('flicker-animation');