




const cardHeader = document.querySelector("card-module header");
const actionArea = document.querySelector("action-area");
var index = 0;

var pePromise = fetch('https://perpetual.education/wp-json/wp/v2/shortcut');
pePromise
	.then( function(rawData) {
		return rawData.json();
	})
	.then( function(shortCuts) {
		console.log(shortCuts);
		const beginButton = document.querySelector("button#begin");
		beginButton.addEventListener("click", function () {
			CardRenderer(index, shortCuts);
		});
	})
	.catch( function() {
		console.log('oops');
	})
;

function CardRenderer(index, cardsData) {
	if (index < cardsData.length) {
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

	const headerTemplate = `<h1 class="category">${cardType}</h1>
<h2 class="card-count">${index + 1}/${cardsData.length}</h2>
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
		var keysString = '';
		var keys = cardData.acf.keys;
		keys.forEach(function(key, i) {
			keysString += '<span class="glyph">' + key.key + '</span>';
			if (i < keys.length - 1) {

				keysString += '+';
			}
		});
		cardBack = '<div class="keys firm-voice">' + keysString + '</div>' + cardBack;
	}

	const template = `<flash-card id='card${index}'>
		<front-side>

			<p class="notice-voice">${cardFront}</p>

		</front-side>
		<back-side class='hide'>
			<p>${cardBack}</p>
		</back-side>
		<div class="buttons">
				<button id="reveal">Flip</button>
				<button class='hide' id="bad">Bad</button>
				<button class='hide' id="good">Good</button>
			</div>
	</flash-card>`;

	return template;
}


function buttonHandler(index, cardsData) {
	const revealButton = document.querySelector("button#reveal");
	const badButton = document.querySelector("button#bad");
	const goodButton = document.querySelector("button#good");

	revealButton.addEventListener("click", function () {
		var backSide = document.querySelector("flash-card back-side");
		backSide.classList.toggle("hide");
		revealButton.classList.toggle("hide");
		badButton.classList.toggle("hide");
		goodButton.classList.toggle("hide");
	});

	badButton.addEventListener("click", function () {
		//push back card step
		index++;
		CardRenderer(index, cardsData);
	});
	goodButton.addEventListener("click", function () {
		//push early card step
		index++;
		CardRenderer(index, cardsData);
	});
	
	
}

function renderEnd() {
	cardHeader.innerHTML = `<h1 class="welcome">Finished!</h1>`;
	actionArea.innerHTML = `<form>
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
	redoButton.addEventListener("click", function () {
		CardRenderer(index, shortCuts);
	});

};





	