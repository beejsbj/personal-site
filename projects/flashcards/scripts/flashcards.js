class Flashdeck {
	constructor( userName ) {
		this.today = new Date();
		this.index = 0;
		this.userName = userName;
		this.repBoxes = [ 1, 3, 7, 14, 30 ]; //days
		this.dayInMiliSeconds = 24 * 60 * 60 * 1000;
		this.dueToday = 0;
		this.$cardHeader = document.querySelector( "card-module header" );
		this.$actionArea = document.querySelector( "action-area" );
		this.$numOfCardsInput = document.querySelector( '#num-cards' );
		this.$beginButton = document.querySelector( "button#begin" );
		this.getData();
	}
	getData() {
		var pePromise = fetch( 'https://perpetual.education/wp-json/wp/v2/shortcut/?per_page=100' );
		pePromise.then( function( rawData ) {
				return rawData.json();
			} )
			.then( ( sourceJson ) => {
				this.cards = ( localStorage.Flashcards ) ? JSON.parse( localStorage.Flashcards ) : sourceJson; //check local storage first, if empty, user api data.
				this.$beginButton.classList.remove( 'hide-opacity' ); //show button after data is fetched
				this.$beginButton.addEventListener( "click", () => {
					this.cards = this.shuffle( this.filteredSlection( this.cards ) ); //filter cards based on checkbox selection and shuflle
					this.cards = this.filteredToday(); //filter cards due to be reviewed today
					this.numCardsToReview = ( this.cards.length >= this.$numOfCardsInput.value ) ? this.$numOfCardsInput.value : this.cards.length;
					this.cardRenderer( this.index );
				} );
			} )
			.catch( function() {
				console.log( 'oops' );
			} );
	}
	findCard( id ) {
		return this.cards.find( function( card ) {
			return card.id == id;
		} );
	}
	moveNext( index ) {
		let card = this.cards[ index ];
		let box = ( card.repBox ) ? this.repBoxes.indexOf( card.repBox ) : this.repBoxes[ 1 ]; //if a box isnt set, set to default of 3
		if ( box != this.repBoxes.length - 1 ) {
			card.repBox = this.repBoxes[ ++box ];
		}
		card.lastReviewDate = new Date();
		card.nextReviewDate = this.setNextDate( card );
		this.printer( `Correct! you ${this.userName}, will see this card in ${card.repBox} days` );
		this.setData();
	}
	// move card to older box.
	moveBack( index ) {
		let card = this.cards[ index ];
		let box = ( card.repBox ) ? this.repBoxes.indexOf( card.repBox ) : this.repBoxes[ 1 ];
		if ( box != 0 ) {
			card.repBox = this.repBoxes[ --box ];
		}
		card.lastReviewDate = new Date();
		card.nextReviewDate = this.setNextDate( card );
		this.printer( `Wroooog ${this.userName} you'll see this card in ${card.repBox} days` );
		this.setData();
	}
	setNextDate( card ) {
		return new Date( card.lastReviewDate.getTime() + card.repBox * this.dayInMiliSeconds );
	}
	setData() {
		localStorage.Flashcards = JSON.stringify( this.cards );
	}
	printer( text ) {
		console.log( "-----------------------" );
		console.log( text );
	}
	cardRenderer( index ) {
		if ( index < this.numCardsToReview ) {
			this.$cardHeader.innerHTML = this.headerTemplater( index );
			this.$actionArea.innerHTML = this.cardTemplater( index );
			this.buttonHandler();
		} else {
			this.renderEnd();
		}
	};
	headerTemplater( index ) {
		var card = this.cards[ index ];
		var cardType = card.type;

		var slug = 'https://perpetual.education/study-hall/#' + card.slug;
		// var cardLesson = card.lesson; //lesson
		var cardApplication = ( card.acf.application[ 0 ] ) ? card.acf.application[ 0 ].post_title : "no data"; //aplication instead of lesson
		const headerTemplate = `
		<a target="study-hall" href="${slug}" class="category ${cardType}">
			${cardType}
		</a>
		<h2 class="card-count">
			${index + 1}/${this.numCardsToReview}
			<span class="due-${this.dueToday}" >[Due: ${this.dueToday}]</span>
		</h2>
		<h3 class="lesson">
			${cardApplication}
		</h3>`;
		return headerTemplate;
	}
	cardTemplater( index ) {
		var card = this.cards[ index ];
		var cardFront = card.acf.name;
		var cardBack = card.acf.short_description;
		if ( card.type == "shortcut" ) {
			cardBack = this.keysTemplater( card ) + cardBack;
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
	keysTemplater( card ) {
		var keysString = '';
		var keys = card.acf.keys;
		keys.forEach( function( key, i ) {
			keysString += '<span class="glyph">' + key.key + '</span>';
			if ( i < keys.length - 1 ) {
				keysString += '+';
			}
		} );
		return '<div class="keys firm-voice">' + keysString + '</div>';
	}
	renderEnd() {
		this.$cardHeader.innerHTML = `<h1 class="welcome">Finished!</h1>`;
		this.$actionArea.innerHTML = `
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
				<input type="number" id="num-cards" name="num-cards" value="${this.numCardsToReview}" min="5" step="1">
				<label class="calm-voice" for="num-cards">How many cards would you like to review?</label>
			</input-field>
			<div class="buttons">
						<button id="redo" type="reset"> Go again? </button>
					</div>
		</form>`;
		const $redoButton = document.querySelector( "button#redo" );
		$redoButton.addEventListener( "click", () => {
			this.index = 0;
			this.numCardsToReview = document.querySelector( '#num-cards' )
				.value;
			this.cardRenderer( this.index );
		} );
	};
	buttonHandler() {
		const $revealButton = document.querySelector( "button#reveal" );
		const $badButton = document.querySelector( "button#bad" );
		const $goodButton = document.querySelector( "button#good" );
		console.log(this.index)
		$revealButton.addEventListener( "click", function() {
			var $backSide = document.querySelector( "flash-card back-side" );
			$backSide.classList.toggle( "hide" );
			$revealButton.classList.toggle( "hide" );
			$badButton.classList.toggle( "hide" );
			$goodButton.classList.toggle( "hide" );
		} );
		$badButton.addEventListener( 'click', () => {
			this.moveBack( this.index ) //push back card step
			this.cardRenderer( this.index++ );
		} )
		$goodButton.addEventListener( 'click', () => {
			this.moveNext( this.index ) //push front card step
			this.cardRenderer( this.index++ );
		} )
	}
	filteredSlection( cardsData ) {
		var $selections = document.querySelectorAll( '.card-filter input:checked' );
		$selections = Array.from( $selections );
		if ( $selections.length ) {
			return cardsData.filter( function( card ) {
				for ( let i = 0; i < $selections.length; i++ ) {
					if ( card.acf.application[ 0 ] ) {
						return card.acf.application[ 0 ].post_name == $selections[ i ].value;
					}
				}
			} )
		} else {
			return cardsData;
		}
	}
	filteredToday() {
		console.log( this.cards )
		let sorted = this.cards.sort( ( card ) => {
			if ( card.nextReviewDate ) {
				card.nextReviewDate = new Date( card.nextReviewDate );
				if ( card.nextReviewDate.toDateString() == this.today.toDateString() ) {
					this.dueToday++;
					return 1;
				}
				return -1;
			}
			return -1;
		} )
		console.log( sorted )
		return sorted;
	}
	// Fisher-Yates (aka Knuth) Shuffle.
	shuffle( array ) {
		let currentIndex = array.length,
			randomIndex;
		// While there remain elements to shuffle.
		while ( currentIndex != 0 ) {
			// Pick a remaining element.
			randomIndex = Math.floor( Math.random() * currentIndex );
			currentIndex--;
			// And swap it with the current element.
			[ array[ currentIndex ], array[ randomIndex ] ] = [
				array[ randomIndex ], array[ currentIndex ]
			];
		}
		return array;
	}
}
var yourDeck = new Flashdeck( 'Study Hall' );