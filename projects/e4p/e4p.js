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
function SayingHello( $outlet ) {
	var $name = document.querySelector( 'input#nme' );
	if ( $name ) {
		var template = 'hello, <span>' + $name.value + '</span> wassup?';
		$outlet.innerHTML = `<p>${template}</p>`
		$name.value = "";
	}
	toggleOutlet();
}
// Counting the Number of Characters -->
function CountingTheNumberOfCharacters( $outlet ) {
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
function PrintingQuotes( $outlet ) {
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
function MadLib( $outlet ) {
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

function SimpleMath( $outlet ) {
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
function RetirementCalculator( $outlet ) {
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

	 if (ageDifference <= 0) {
	            template = "What're you doing?! you can retire already. <br> go! go!";
	        }

	$outlet.innerHTML = `<p>${template}</p>`
	toggleOutlet();
}
// // 7 Area of a Rectangular Room -->
// function RectArea() {
// 	// prompt for length and width of room in feet.
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
// 	// calculate the area, point var to it
// 	var areaInFt = length * width;
// 	// convert to meters
// 	const ftToMeters = 0.09290304;
// 	var areaInMeters = areaInFt * ftToMeters;
// 	// concat area in ft and area in meters to string and alert it
// 	var output = `You entered dimensions of ${width} feet by ${length} feet.
// The area is
// ${areaInFt} square feet
// ${areaInMeters} square meters`
// 	alert(output);
// }
// // Pizza Party -->
// function PizzaParty() {
// 	// prompt for number of people
// 	var people = parseInt(prompt('how many people?'));
// 	while (people == "") {
// 		alert('you have to enter a number');
// 		var people = parseInt(prompt('how many people?'));
// 	}
// 	// prompt for number of pizzas
// 	var pizzas = parseInt(prompt('how many pizzas?'));
// 	while (pizzas == "") {
// 		alert('you have to enter a number');
// 		var pizzas = parseInt(prompt('how many pizzas?'));
// 	}
// 	// init var for number of slices in a single pizza, defaut value.
// 	const slicesPerPizza = 8;
// 	var totalSlices = slicesPerPizza * pizzas
// 	// store the quotient and reminder after dividing the people over pizzas
// 	var slicesPerPerson = parseInt(totalSlices / people);
// 	var leftoverSlices = totalSlices % people;
// 	// concat into string and print
// 	var output = `${people} people with ${pizzas} pizzas
// Each person gets ${slicesPerPerson} pieces of pizza.
// There are ${leftoverSlices} leftover pieces.`
// 	alert(output);
// }
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