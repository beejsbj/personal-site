var dials = document.querySelectorAll('.dials')
var checked = document.querySelectorAll('.dials:checked');
var labels = document.querySelectorAll('label');

const count = 5;

// get numbers of the winner
const winningNumbers = getRndIntArr(1, 50);

// trigger for each of the dials
dials.forEach(dial => {
	dial.addEventListener('click', selectionLimit);
});

// submit button trigger
var submitButton = document.querySelector('.submit');
submitButton.addEventListener('click', submit);

// roll button trigger
var rollButton = document.querySelector('.roll');
rollButton.addEventListener('click', roll);

//limit number of checked dials to not go above ccount
function selectionLimit() {
	var checked = document.querySelectorAll('.dials:checked')
	if (checked.length > count) {
		alert('Only select ' + count);
		this.checked = false;
	}
}
function submit() {
	selectionLimit()
	var checked = document.querySelectorAll('.dials:checked')
	var values = [];
	checked.forEach((dial) => {
		values.push(dial.value);
	})
	checkWinner(values);
}

function resetDials() {
	dials.forEach((dial) => {
		dial.checked = false;
	})
}

function getRndIntArr(min, max) {
	numbers = [];
	for (var i = 0; i < count; i++) {
		var randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
		while (numbers.includes(randomNum)) {
			randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
		}
		numbers.push(randomNum);
	}
	return numbers;
}
// rollButton
function roll() {
	resetDials();
	addLabelClass('rotate-center');
	var rolledArr = getRndIntArr(1, 50);
	for (var i = 0; i < rolledArr.length; i++) {
		dial = '#dial-' + rolledArr[i];
		var dialElement = document.querySelector(dial);
		dialElement.checked = true;
	}
	setTimeout(removeLabelClass, 1200, 'rotate-center');
}

function checkWinner(userNumbers) {
	winningNumbers.join('-')
	if (userNumbers.sort(function(a, b) { return a - b }) == winningNumbers.sort(function(a, b) { return a - b })) {
		alert('winningNumbers are: ' + winningNumbers.join('-'))
		alert('You won!');
	} else {
		alert('winningNumbers are: ' + winningNumbers.join('-'))
		alert('You lost');
	}
}

function addLabelClass(className) {
	labels.forEach(label => {
		label.classList.add(className);
	});
}
function removeLabelClass(className) {
	labels.forEach(label => {
		label.classList.remove(className);
	});
}