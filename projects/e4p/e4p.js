//init
function toggleOutlet() {
	document.querySelector( 'div#e4p-output' )
		.classList.remove( 'hide' );
	document.querySelector( 'div#e4p-output' )
		.classList.add( 'output-field' );
}

// boiler
function exercise( $outlet ) {
	var $input = document.querySelector( '#e4p input' );
	if ( $input ) {
		var template = `<span></span>`;
		$outlet.innerHTML = `<p>${template}</p>`
		$input.value = "";
	}
	toggleOutlet();
}
// Saying Hello -->
function sayingHello( $outlet ) {
	var $name = document.querySelector( 'input#nme' );
	if ( $name ) {
		var template = 'hello, <span>' + $name.value + '</span> wassup?';
		$outlet.innerHTML = `<p>${template}</p>`
		$name.value = "";
	}
	toggleOutlet();
}
// Counting the Number of Characters -->
function countingTheNumberOfCharacters( $outlet ) {
	var $string = document.querySelector( 'input#char-count' );
	// get length of $string and store it in another variable
	var stringLen = $string.value.length
	// if length is 0, prompt user for $string agian
	if ( $string ) {
		// if not, template the length value
		var template = `<span>${$string.value}</span> seems to have <span>${stringLen}</span> characters.`;
		$outlet.innerHTML = `<p>${template}</p>`
		$string.value = "";
	}
	toggleOutlet();
}
// Printing Quotes -->
function printingQuotes( $outlet ) {
	var $author = document.querySelector( '#e4p input#author' );
	var $quote = document.querySelector( '#e4p input#quote' );
	if ( $author && $quote ) {
		var template = `<span>${$author.value}</span> says, <em>"${$quote.value}"</em>`;
		$outlet.innerHTML = `<p>${template}</p>`
		$author.value = "";
		$quote.value = "";
	}
	toggleOutlet();
}
// // Mad lib -->
function madLib( $outlet ) {
	var $noun = document.querySelector( '#e4p input#noun' );
	var $verb = document.querySelector( '#e4p input#verb' );
	var $adjective = document.querySelector( '#e4p input#adjective' );
	var $adverb = document.querySelector( '#e4p input#adverb' );
	if ( $noun && $verb && $adjective && $adverb ) {
		var template = `Do you <span>${$verb.value}</span> your <span>${$adjective.value}</span> <span>${$noun.value}</span> <span>${$adverb.value}</span>? That's hilarious!`;
		$outlet.innerHTML = `<p>${template}</p>`
		$noun.value = "";
		$verb.value = "";
		$adjective.value = "";
		$adverb.value = "";
	}
	toggleOutlet();
}

function simpleMath( $outlet ) {
	var $first = document.querySelector( '#e4p input#first-id' );
	var $second = document.querySelector( '#e4p input#second-id' );
	let sum = $first.value + $second.value;
	let difference = $first.value - $second.value;
	let product = $first.value * $second.value;
	let quotient = $first.value / $second.value;
	if ( $first && $second ) {
		var template = `<span>${$first.value}</span> + <span>${$second.value}</span> = ${sum}<br>
                        <span>${$first.value}</span> - <span>${$second.value}</span> = ${difference}<br>
                        <span>${$first.value}</span> * <span>${$second.value}</span> = ${product}<br>
                        <span>${$first.value}</span> / <span>${$second.value}</span> = ${quotient}<br>`;
		$outlet.innerHTML = `<p>${template}</p>`
		$first.value = "";
		$second.value = "";
	}
	toggleOutlet();
}
// // retirement calculator -->
function retirementCalculator( $outlet ) {
	var templatel
	var $currentAge = document.querySelector( '#e4p input#current-age' );
	var $retireAge = document.querySelector( '#e4p input#retire-age' );
	var ageDifference = $retireAge.value - $currentAge.value;
	const today = new Date();
	let currentYear = today.getFullYear();
	let retireYear = currentYear + ageDifference;
	if ( $currentAge && $retireAge ) {
		template = `You have <span>${ageDifference}</span> years left until you can retire.<br>
                        It's <span>${currentYear}</span>, so you can retire in <span>${retireYear}</span>.`;
		$currentAge.value = "";
		$retireAge.value = "";
	}
	if ( ageDifference <= 0 ) {
		template = "What're you doing?! you can retire already. <br> go! go!";
	}
	$outlet.innerHTML = `<p>${template}</p>`
	toggleOutlet();
}

function areaOfARectangularRoom( $outlet ) {
	var $unit = document.querySelector( "#e4p .radio-list input[name='unitChoice']:checked" );
	let $length = document.querySelector( "#length" );
	let $width = document.querySelector( "#width" );
	const convertConst = 0.09290304;
	console.log( $unit )
	if ( $unit.value == 'feet' ) {
		let areaFt = $length.value * $width.value;
		let areaMt = areaFt * convertConst;
		var template = `The area is<br>
                        <span>${areaFt}</span> square feet<br>
                        <span>${areaMt.toFixed(2)}</span> square meters`;
	} else {
		let areaMt = $length.value * $width.value;
		let areaFt = areaMt / convertConst;
		var template = `The area is<br>
                        <span>${areaMt}</span> square meters<br>
                        <span>${areaFt.toFixed(2)}</span> square feet`;
	}
	$outlet.innerHTML = `<p>${template}</p>`
	$length.value = "";
	$width.value = "";
	toggleOutlet();
}

function pizzaParty( $outlet ) {
	var $people = document.querySelector( '#e4p #people' );
	var $pizzas = document.querySelector( '#e4p #pizzas' );
	var $slices = document.querySelector( '#e4p #slices' );
	//calculations
	var totalSlices = $pizzas.value * $slices.value;
	console.log(totalSlices)
	var slicesPerPerson = ( totalSlices / $people.value ).toFixed(0);
	var leftover = ( totalSlices % $people.value )
		.toFixed( 0 );
	//checking for plurals
	personPluraler = ( $people.value > 1 ) ? "people" : "person";
	pizzaPluraler = ( $pizzas.value > 1 ) ? "pizzas" : "pizza";
	slicePluraler = ( slicesPerPerson > 1 ) ? "slices" : "slice";
	var template = `<span>${$people.value} ${personPluraler}</span> with <span>${$pizzas.value} ${pizzaPluraler}</span>?<br>
                       So each person gets <span>${slicesPerPerson} ${slicePluraler}</span> of pizza.<br>
                       There's <span>${leftover}</span> leftover slices.`;
	$outlet.innerHTML = `<p>${template}</p>`
	$people.value = "";
	$pizzas.value = "";
	$slices.value = "";
	toggleOutlet();
}
// // Paint Calc -->
// function PaintCalc() {
// 	// promt for length and width
// 	var length = parseInt(prompt('what is the length?'));
// 	while (length == "") {
// 		alert('you have to enter a number');
// 		var length = parseInt(prompt('what is the length?'));
// 	}
// 	var width = parseInt(prompt('what is the width?'));
// 	while (width == "") {
// 		alert('you have to enter a number');
// 		var width = parseInt(prompt('what is the width?'));
// 	}
// 	// init constant areapergallon = 350
// 	const areaPerGallon = 350;
// 	// calculate area of cieling
// 	var area = length * width;
// 	// calculate gallons needed per area
// 	var gallons = area / areaPerGallon;
// 	// round up gallons to a whole number
// 	gallons = Math.ceil(gallons);
// 	var output = `You will need to purchase ${gallons} gallons of
// paint to cover ${area} square feet.`;
// 	alert(output);
// }
// function SelfCheckout() {
// 	// init const tax
// 	// promtp for price of item 1
// 	var priceItem1 = parseInt(prompt('what is the price of item 1?'));
// 	while (priceItem1 == "") {
// 		alert('you have to enter a number');
// 		var priceItem1 = parseInt(prompt('what is the price of Item 1?'));
// 	}
// 	// promt for quantity of item 1
// 	var quantityItem1 = parseInt(prompt('what is the quantity of item 1?'));
// 	while (quantityItem1 == "") {
// 		alert('you have to enter a number');
// 		var quantityItem1 = parseInt(prompt('what is the quantity of Item 1?'));
// 	}
// 	// promtp for price of item 2
// 	var priceItem2 = parseInt(prompt('what is the price of item 2?'));
// 	while (priceItem2 == "") {
// 		alert('you have to enter a number');
// 		var priceItem2 = parseInt(prompt('what is the price of Item 2?'));
// 	}
// 	// promt for quantity of item 2
// 	var quantityItem2 = parseInt(prompt('what is the quantity of item 2?'));
// 	while (quantityItem2 == "") {
// 		alert('you have to enter a number');
// 		var quantityItem2 = parseInt(prompt('what is the quantity of Item 2?'));
// 	}
// 	// promtp for price of item 3
// 	var priceItem3 = parseInt(prompt('what is the price of item 3?'));
// 	while (priceItem3 == "") {
// 		alert('you have to enter a number');
// 		var priceItem3 = parseInt(prompt('what is the price of Item 3?'));
// 	}
// 	// promt for quantity of item 3
// 	var quantityItem3 = parseInt(prompt('what is the quantity of item 3?'));
// 	while (quantityItem3 == "") {
// 		alert('you have to enter a number');
// 		var quantityItem3 = parseInt(prompt('what is the quantity of Item 3?'));
// 	}
// 	// calculate subtotal
// 	var subTotal = ((priceItem1 * quantityItem1) + (priceItem2 * quantityItem2) + (priceItem3 * quantityItem3));
// 	// calculate tax
// 	const taxRate = 5.5 / 100;
// 	var tax = (taxRate * subTotal);
// 	// get total by add tax and subtotal
// 	var total = subTotal + tax
// 	// alert total
// 	var output = `Subtotal: ${subTotal.toFixed(2)}
// Tax: ${tax.toFixed(2)}
// Total: ${total.toFixed(2)}`
// 	alert(output)
// }