const cardHeader = document.querySelector("card-module header");
const actionArea = document.querySelector("action-area");
var index = 0;
var sourceCardsData;
var numCardsToReview;

var pePromise = fetch('https://perpetual.education/wp-json/wp/v2/shortcut/?per_page=100');
pePromise.then(function(rawData) {
	return rawData.json();
	})
	.then(function(sourceJson) {
		sourceCardsData = sourceJson;
		console.log(sourceCardsData);

		const beginButton = document.querySelector("button#begin");
		beginButton.addEventListener("click", function() {
			numCardsToReview = document.querySelector('#num-cards').value;
			cardRenderer(index, sourceCardsData);
		});
	})
	.catch(function() {
		console.log('oops');
});

function cardRenderer(index, cardsData) {
	if (index < numCardsToReview) {
		cardHeader.innerHTML = headerTemplater(index, cardsData);
		actionArea.innerHTML = cardTemplater(index, cardsData);
		buttonHandler(index, cardsData);
	} else {
		renderEnd();
	}
};

function headerTemplater(index, cardsData) {
	var cardData = cardsData[index];
	var cardType = cardData.type;
	var cardLesson = cardData.lesson;
	const headerTemplate = `
		<h1 class="category">
			${cardType}
		</h1>
		<h2 class="card-count">
			${index + 1}/${numCardsToReview}
		</h2>
		<h3 class="lesson">
			${cardLesson}
		</h3>`;
	return headerTemplate;
}

function cardTemplater(index, cardsData) {
	var cardData = cardsData[index];
	var cardFront = cardData.acf.name;
	var cardBack = cardData.acf.short_description;

	if (cardData.type == "shortcut") {
		cardBack = shortcutsCard(cardData, cardFront, cardBack);
	}
	const template = `
		<flash-card id='card${index}'>
			<front-side>
				<p class="notice-voice">${cardFront}</p>
			</front-side>

			<back-side class='hide'>
				<p>${cardBack}</p>
			</back-side>
		</flash-card>
		<div class="buttons">
			<button id="reveal">Flip</button>
			<button class='hide' id="bad">Bad</button>
			<button class='hide' id="good">Good</button>
		</div>`;
	return template;
}

function shortcutsCard(cardData, cardFront, cardBack) {
	var keysString = '';
	var keys = cardData.acf.keys;
	keys.forEach(function(key, i) {
		keysString += '<span class="glyph">' + key.key + '</span>';
		if (i < keys.length - 1) {
			keysString += '+';
		}
	});
	cardBack = '<div class="keys firm-voice">' + keysString + '</div>' + cardBack;
	return cardBack;
}


function buttonHandler(index, cardsData) {
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
			cardRenderer(index, cardsData);
		}
		if (event.target.matches('button#good')) {
			//push early card step
			index++;
			cardRenderer(index, cardsData);
		}
	})
	revealButton.addEventListener("click", function() {
		var backSide = document.querySelector("flash-card back-side");
		backSide.classList.toggle("hide");
		revealButton.classList.toggle("hide");
		badButton.classList.toggle("hide");
		goodButton.classList.toggle("hide");
	});
	badButton.addEventListener("click", function() {
		// //push back card step
		// index++;
		// cardRenderer(index, cardsData);
	});
	goodButton.addEventListener("click", function() {
		// //push early card step
		// index++;
		// cardRenderer(index, cardsData);
	});
}

function renderEnd() {
	cardHeader.innerHTML = `<h1 class="welcome">Finished!</h1>`;
	actionArea.innerHTML = `
		<form>
			<ul>
				<li>
					<input type="checkbox" id="shortcuts" name="shortcuts" value="Bike">
					<label for="shortcuts"> Shortcuts</label>
				</li>
				<li>
					<input type="checkbox" id="concepts" name="concepts" value="Bike">
					<label for="concepts"> concepts</label>
				</li>
			</ul>
			<button id="redo" type="reset"> Go again? </button>
		</form>`;
	const redoButton = document.querySelector("button#redo");
	redoButton.addEventListener("click", function() {
		index = 0;
		cardRenderer(index, sourceCardsData);
	});
};