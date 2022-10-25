const cardHeader = document.querySelector("card-module header");
const actionArea = document.querySelector("action-area");
var index = 0;
var cards;
var numCardsToReview;
var numOfCardsInput = document.querySelector('#num-cards');
const beginButton = document.querySelector("button#begin");


var pePromise = fetch('https://perpetual.education/wp-json/wp/v2/shortcut/?per_page=100');
pePromise
	.then(function(rawData) {
		return rawData.json();
	})
	.then(function(sourceJson) {
		cardsData = sourceJson;
		cards = shuffle(filteredCards(cardsData));
		beginButton.classList.remove('hide-opacity'); //show button after data is fetched
		beginButton.addEventListener("click", function() {
			numCardsToReview = numOfCardsInput.value;
			cardRenderer(index);
		});
	})
	.catch(function() {
		console.log('oops');
});

function cardRenderer(index) {
	if (index < numCardsToReview) {
		cardHeader.innerHTML = headerTemplater(index);
		actionArea.innerHTML = cardTemplater(index);
		buttonHandler(index);
	} else {
		renderEnd();
	}
};

function headerTemplater(index) {
	var card = cards[index];
	var cardType = card.type;
	// var cardLesson = card.lesson; //lesson
	var cardApplication = card.acf.application[0]?.post_title ?? "no data"; //aplication instead of lesson
	const headerTemplate = `
		<h1 class="category">
			${cardType}
		</h1>
		<h2 class="card-count">
			${index + 1}/${numCardsToReview}
		</h2>
		<h3 class="lesson">
			${cardApplication}
		</h3>`;
	return headerTemplate;
}

function cardTemplater(index) {
	var card = cards[index];
	var cardFront = card.acf.name;
	var cardBack = card.acf.short_description;

	if (card.type == "shortcut") {
		cardBack = keysTemplater(card)  + cardBack;
	}
	const template = `
		<flash-card id='card${index}'>
			<front-side>
				<p class="notice-voice">${cardFront}</p>
			</front-side>

			<back-side class='hide'>
				${cardBack}
			</back-side>
		</flash-card>
		<div class="buttons">
			<button id="reveal">Flip</button>
			<button class='hide' id="bad">Bad</button>
			<button class='hide' id="good">Good</button>
		</div>`;
	return template;
}

function keysTemplater(card) {
	var keysString = '';
	var keys = card.acf.keys;
	keys.forEach(function(key, i) {
		keysString += '<span class="glyph">' + key.key + '</span>';
		if (i < keys.length - 1) {
			keysString += '+';
		}
	});
	return '<div class="keys firm-voice">' + keysString + '</div>';
}


function buttonHandler(index) {
	const revealButton = document.querySelector("button#reveal");
	const badButton = document.querySelector("button#bad");
	const goodButton = document.querySelector("button#good");
	document.addEventListener("click", function(event) {
		// if (event.target.matches('button#reveal')) {
		// 	var backSide = document.querySelector("flash-card back-side");
		// 	console.log(backSide)
		// 	backSide.classList.toggle("hide");
		// 	revealButton.classList.toggle("hide");
		// 	badButton.classList.toggle("hide");
		// 	goodButton.classList.toggle("hide");
		// }
		if (event.target.matches('button#bad')) {
			//push back card step
			index++;
			cardRenderer(index);
		}
		if (event.target.matches('button#good')) {
			//push early card step
			index++;
			cardRenderer(index);
		}
	})
	revealButton.addEventListener("click", function() {
		var backSide = document.querySelector("flash-card back-side");
		backSide.classList.toggle("hide");
		revealButton.classList.toggle("hide");
		badButton.classList.toggle("hide");
		goodButton.classList.toggle("hide");
	});
}

function renderEnd() {
	cardHeader.innerHTML = `<h1 class="welcome">Finished!</h1>`;
	actionArea.innerHTML = `
		<form>
			<ul class="card-filter">
				<li>
					<input type="checkbox" id="universal" name="universal" value="universal">
					<label for="universal">Universal</label>
				</li>
				<li>
					<input type="checkbox" id="macos" name="macos" value="macos">
					<label for="macos">MacOS</label>
				</li>
				<li>
					<input type="checkbox" id="finder" name="finder" value="finder">
					<label for="finder">Finder</label>
				</li>
				<li>
					<input type="checkbox" id="sublime-text" name="sublime-text" value="sublime-text">
					<label for="sublime-text">Sublime Text</label>
				</li>
				<li>
					<input type="checkbox" id="divvy" name="divvy" value="divvy">
					<label for="divvy">Divvy</label>
				</li>
			</ul>
			<input-field>
				<input type="number" id="num-cards" name="num-cards" value="${numCardsToReview}" min="5" step="1">
				<label for="num-cards">How many cards would you like to review?</label>
			</input-field>
			<button id="redo" type="reset"> Go again? </button>
		</form>`;
	const redoButton = document.querySelector("button#redo");
	redoButton.addEventListener("click", function() {
		index = 0;
		numCardsToReview = document.querySelector('#num-cards').value;
		cardRenderer(indexData);
	});
};


function filteredCards(cardsData) {
	var selections = document.querySelectorAll('.card-filter input:checked');

	selections = Array.from(selections);

	if (selections.length) {
		return filteredCards = cardsData.filter( function(card) {

			for (let i = 0; i < selections.length; i++) {
				if (card.acf.application[0].post_name == selections[i].value) {
					return true;
				}
			}
		})
	} else {
		return cardsData;
	}

}


// Fisher-Yates (aka Knuth) Shuffle.
function shuffle(array) {
	let currentIndex = array.length, randomIndex;

	// While there remain elements to shuffle.
	while (currentIndex != 0) {
		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]
		];
	}
	return array;
}


 