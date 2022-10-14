const spinTime = 5000;
var frameTime = 150;
const blueNums = [3, 32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12];
var centerResultDiv = document.querySelector("div.result");
var spinSvgs = document.querySelectorAll("svg#spin-button > g > :not(#blue-circle)");
var spinText = document.querySelector("div.spin-text");

//number chart styling
blueNums.forEach(function(blueNum) {
	var blueCheckbox = document.querySelector(`#num-${blueNum} + label`);
	blueCheckbox.style.borderColor = "var(--blue)";
	blueCheckbox.style.boxShadow = "0px 0px 5px var(--blue)";
})

function wheelStrokeColor(i) {
	var allColorStrokes = document.querySelectorAll('#color-slices path');
	var allWhiteStrokes = document.querySelectorAll('#white-slices path');
	if (blueNums.includes(i)) {
		allColorStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--blue)";
			centerResultDiv.classList.add('blue');
		})
		allWhiteStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--blue)";
		})
	} else {
		allWhiteStrokes.forEach(function(stroke) {
			stroke.style.fill = "var(--red)";
			centerResultDiv.classList.add('red');
		})
		allColorStrokes.forEach(function(stroke) {
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
// as timePassed goes from 0 to frameTime
function highlight(timePassed, i) {
	var whiteSliceName = `#white-slices #slice-${i}`;
	var colorSliceName = `#color-slices #slice-${i}-color`;
	var currentWhiteSlice = document.querySelector(whiteSliceName);
	var currentColorSlice = document.querySelector(colorSliceName);
	currentWhiteSlice.classList.add('selected');
	currentColorSlice.classList.add('selected');
	centerResult(i); //show number in center
	wheelStrokeColor(i); //change color of wheel to match number
	if (timePassed < (spinTime - frameTime)) {
		setTimeout(function() {
			currentWhiteSlice.classList.remove('selected');
			currentColorSlice.classList.remove('selected');
		}, frameTime);
	} else {
		checkWin(i);
	}
}
// spin button
var spinButton = document.querySelector('button#spin');
spinButton.addEventListener("click", function() {
	if (selectionLimitLower() == false) {
		return;
	}
	resetSLiceClass();
	var start = Date.now(); // remember start time
	setInterval(animations, frameTime, start);
});


function resetSLiceClass() {
	var selectedSlices = document.querySelectorAll(".selected");
	selectedSlices.forEach(function(slice) {
		// console.log(slice);
		slice.classList.remove("selected");
		// console.log(slice);
	})
}

function centerResult(i) {
	spinSvgs.forEach(function(spinSvg) {
		spinSvg.classList.add('hide');
	})
	spinText.classList.add('hide');
	centerResultDiv.classList.remove('hide');
	centerResultDiv.classList.remove('blue');
	centerResultDiv.classList.remove('red');
	centerResultDiv.innerHTML = i;
}

//animation flicker
var titleLetter = document.querySelector(`h1 span:nth-of-type(${Math.floor(Math.random() * 8) + 1})`)
titleLetter.classList.add('flicker-animation');
var titleLetter2 = document.querySelector(`h1 span:nth-of-type(${Math.floor(Math.random() * 8) + 1})`)
titleLetter2.classList.add('flicker-animation2');

var spinSignLetter = document.querySelector(`div.spin-text span:nth-of-type(${Math.floor(Math.random() * 4) + 1})`)
spinSignLetter.classList.add('flicker-animation');

//random element within choose box
var randomChooseEles = document.querySelectorAll('choose-box *');
randomChooseEle = randomChooseEles[Math.floor(Math.random() * (randomChooseEles.length))]
randomChooseEle.classList.add('flicker-animation');





//winning logic

function showHideInfoBox() {
	var resultsBox = document.querySelector('results-box');
	var chooseBox = document.querySelector('choose-box');
	resultsBox.classList.toggle('hide');
	chooseBox.classList.toggle('hide');
}

function checkWin(i) {
	showHideInfoBox();
	var userSelection = document.querySelector('numbers-grid input:checked');
	
	setTimeout(function() {
		var resultWinLose = document.querySelector('.congrats-text');

		console.log(resultWinLose);
		if (winCondition(i, resultWinLose, userSelection)) {
			resultWinLose.innerHTML = "<em> CONGRATULATIONS </em> <span class='win-lose'>YOU WIN</span>";
		} else {
			resultWinLose.innerHTML = "<em> TRY AGAIN </em> <span class='win-lose'>YOU LOSE</span>";
		}

		console.log(resultWinLose);

	}, 200)
}

function winCondition(i, resultWinLose, userSelection) {
	switch (userSelection.value) {
		case i:
			return true;
			break;
		case checkOddEven(i):
			return true;
			break;
		case checkHalves(i):
			return true;
			break;
		case checkColor(i):
			return true;
			break;
		case checkThirds(i):
			return true;
			break;
		default:
			return false;
			break;
	}
}

function checkOddEven(i){
	if (i % 2 == 0) {
		return 'even';
	} else {
		return 'odd';
	}
}

function checkHalves(i){
	if (i <= 18) {
		return 'first18';
	} else {
		return 'second18';
	}
}



function checkColor(i){
	if (blueNums.includes(i)) {
		return 'blue';
	} else {
		return 'red';
	}
}

function checkThirds(i){
	if (i <= 12) {
		return 'first12';
	} else if (i > 24) {
		return 'third12';
	} else {
		return 'second12';
	}
}



var checkboxes = document.querySelectorAll('input[type=checkbox]')
checkboxes.forEach(checkbox => {
	checkbox.addEventListener('click', selectionLimit);
});

//limit number of checked checkboxes to not go above ccount
function selectionLimit() {
	var checked = document.querySelectorAll('numbers-grid input:checked')
	if (checked.length > 1) {
		alert('Only select ' + 1);
		this.checked = false;
	}
}


function selectionLimitLower() {
	var checked = document.querySelectorAll('numbers-grid input:checked')
	if (checked.length == 0) {
		alert('please make and select a bid');
		return false;
	}
}


var playAgain = document.querySelector('button.play-again');

playAgain.addEventListener('click', function() {
	showHideInfoBox();
	resetSLiceClass();
	checkboxes.forEach(checkbox => {
	checkbox.checked = false;

	spinSvgs.forEach(function(spinSvg) {
		spinSvg.classList.remove('hide');
	})
	spinText.classList.remove('hide');
	centerResultDiv.classList.add('hide');
});

})