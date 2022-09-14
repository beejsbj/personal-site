var dials = document.querySelectorAll('.dials')
var checked = document.querySelectorAll('.dials:checked');
var labels = document.querySelectorAll('label');
var currentPool = document.querySelector('#current-bid');
currentPool.value = 0;



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

	if (userNumbers.sort(function(a, b) { return a - b }) == winningNumbers.sort(function(a, b) { return a - b })) {
		renderResult(winningNumbers.join(' '), 'you won');

	} else {
		renderResult(winningNumbers.join(' '), 'you lost');


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
	}, "600");
	setTimeout(() => {
		currentPool.classList.remove('rotate-center');
	}, "1200");
	
}

function resetPool() {
	currentPool.innerHTML = 0;
	return currentPool;
}

function renderResult(winningNumbers, string) {
	var template = `<h1 class="attention-voice">Winning Numbers: <span>${winningNumbers}</span></h1><p class="attention-voice">${string}</p>`;
	var finalResult = document.querySelector('.final-result');
	
	finalResult.innerHTML = template;
	finalResult.classList.remove('hide');
}