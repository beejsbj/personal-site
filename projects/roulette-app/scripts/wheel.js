const spinTime = 5000;
var frameTime = 150;
const blueNums = [3, 32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12];
var resultDiv = document.querySelector("div.result");

function wheelStrokeColor(i) {
	var allStrokes = document.querySelectorAll('#color-slices path');

	if (blueNums.includes(i)) {
		allStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--blue)";
			resultDiv.classList.add('blue');
		})
	} else {
		allStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--red)";
			resultDiv.classList.add('red');
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

// as timePassed goes from 0 to frameTime
function highlight(timePassed, i) {
	

	var whiteSliceName = `#white-slices #slice-${i}`;
	var colorSliceName = `#color-slices #slice-${i}-color`;
	var currentWhiteSlice = document.querySelector(whiteSliceName);
	var currentColorSlice = document.querySelector(colorSliceName);


	currentWhiteSlice.classList.add('selected');
	currentColorSlice.classList.add('selected');
	centerResult(i); 
	wheelStrokeColor(i);
	

	if (timePassed < (spinTime - frameTime)) {
		setTimeout(function() {
			currentWhiteSlice.classList.remove('selected');
			currentColorSlice.classList.remove('selected');
		}, frameTime);
	}
}


// spin button
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

function centerResult(i) {
	var spinSvgs = document.querySelectorAll("svg#spin-button > g > :not(#blue-circle)");
	spinSvgs.forEach(function(spinSvg) {
		spinSvg.classList.add('hide');
	})
	var spinText = document.querySelector("div.spin-text");
	spinText.classList.add('hide');

	resultDiv.classList.remove('hide');
	resultDiv.classList.remove('blue');
	resultDiv.classList.remove('red');
	resultDiv.innerHTML = i;

}



//number chart styling




blueNums.forEach( function(blueNum) {
	var blueCheckbox = document.querySelector(`#num-${blueNum} + label`);
	blueCheckbox.style.borderColor = "var(--blue)";
	blueCheckbox.style.boxShadow = "0px 0px 5px var(--blue)";
})






//animation flicker

var titleSign = document.querySelector(`h1 span:nth-of-type(${Math.floor(Math.random() * 8) + 1})`)
titleSign.classList.add('flicker-animation');

var titleSign2 = document.querySelector(`h1 span:nth-of-type(${Math.floor(Math.random() * 8) + 1})`)
titleSign2.classList.add('flicker-animation2');

var spinSign = document.querySelector(`div.spin-text span:nth-of-type(${Math.floor(Math.random() * 4) + 1})`)
spinSign.classList.add('flicker-animation');