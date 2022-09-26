var dials = document.querySelectorAll('.dials')
var checked = document.querySelectorAll('.dials:checked');
var labels = document.querySelectorAll('label');
var finalResult = document.querySelector('.final-result');

var currentPool = document.querySelector('#current-bid');
currentPool.value = 0;


// number of numbers to play lottery with
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

//checks if number of selection is equal to count
function selectionLimitLower() {
	var checked = document.querySelectorAll('.dials:checked')
	if (checked.length < count) {
		alert('please select ' + count);
		return false;
	}
}

//runs on submit click
function submit() {
	if (!selectionLimitLower() && !getUserBid()) {
		return;
	}
	addUserToPool();
	var checked = document.querySelectorAll('.dials:checked')
	var values = [];
	checked.forEach((dial) => {
		values.push(dial.value);
	})

	setTimeout(checkWinner, 1200, values);
}


// rollButton
function roll() {
	resetDials();
	addLabelClass('li:nth-of-type(odd) label', 'rotate-center');
	addLabelClass('li:nth-of-type(even) label', 'rotate-center-reverse');
	var rolledArr = getRndIntArr(1, 50);
	for (var i = 0; i < rolledArr.length; i++) {
		dial = '#dial-' + rolledArr[i];
		var dialElement = document.querySelector(dial);
		dialElement.checked = true;
	}
	setTimeout(removeLabelClass, 1200, 'rotate-center');
	setTimeout(removeLabelClass, 1200, 'rotate-center-reverse');
}

function checkWinner(userNumbers) {

	if (userNumbers.sort(function(a, b) { return a - b }) == winningNumbers.sort(function(a, b) { return a - b })) {
		renderResult(winningNumbers.join(' '), `YOU WON <span>${currentPool.value} !!!</span>`);
	} else {
		renderResult(winningNumbers.join(' '), 'you lost');
	}
}

function renderResult(winningNumbers, string) {
	var template = `<h1 class="attention-voice">Winning Numbers: <span>${winningNumbers}</span></h1><p class="attention-voice">${string}</p>`;
	var audio = new Audio('stamp.mp3');
	finalResult.innerHTML = template;

	audio.play();
	
	// delay for visual animation so audio plays at same time
	setTimeout(function () {
		finalResult.classList.remove('hide');
	}, 850)
}

function resetDials() {
	dials.forEach((dial) => {
		dial.checked = false;
	})
	finalResult.classList.add('hide');
}

// get array of random integers
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

function addLabelClass(selector, className) {
	document.querySelectorAll(selector).forEach(label => {
		label.classList.add(className);
	});
}
function removeLabelClass(className) {
	labels.forEach(label => {
		label.classList.remove(className);
	});
}

function getUserBid() {
	var bidInput = document.querySelector('#user-bid');
	var bidInputValue = parseFloat(bidInput.value)
	if (!bidInputValue) {
		alert('Please enter a bid amount');
		return false;
	}
	return bidInputValue;
}

function addUserToPool() {
	currentPool.classList.add('rotate-center');
	setTimeout(() => {
		currentPool.innerHTML = `$${getUserBid() + parseFloat(currentPool.innerHTML)}`;
	}, "900");
	setTimeout(() => {
		currentPool.classList.remove('rotate-center');
	}, "1200");
	
}

function resetPool() {
	currentPool.value = 0;
	return currentPool;
}

function animationIterationDelay(ele, animation) {
	var element = document.querySelector(ele);
	element.classList.add(animation);
	setTimeout(() => {
		element.classList.remove(animation);
	}, "1500");
}
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}
setInterval(animationIterationDelay, getRndInteger(6000, 12000), 'bid-card h2', 'bounce-top');
setInterval(animationIterationDelay, getRndInteger(6000, 12000), 'past-card h2', 'bounce-top');
setInterval(animationIterationDelay, getRndInteger(6000, 12000), 'bid-card label', 'wobble-hor-bottom');

