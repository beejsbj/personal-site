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

function paintCalculator( $outlet ) {
	var $length = document.querySelector( '#e4p #lengthid' );
	var $width = document.querySelector( '#e4p #widthid' );
	var galConst = 350;
	if ( $length && $width ) {
		let area = length.value * width.value;
		let gallons = area / galConst;
		var template = `You will need to purchase <span>${gallons}</span> gallons of paint to cover <span>${area}</span> square feet`;
		$outlet.innerHTML = `<p>${template}</p>`
		$length.value = "";
		$width.value = "";
	}
	toggleOutlet();
}

function selfCheckout( $outlet ) {
	//item1
	var $price1 = document.querySelector( '#e4p #priceid1' );
	var $quantity1 = document.querySelector( '#e4p #quantityid1' );
	//item2
	var $price2 = document.querySelector( '#e4p #priceid2' );
	var $quantity2 = document.querySelector( '#e4p #quantityid2' );
	//item3
	var $price3 = document.querySelector( '#e4p #priceid3' );
	var $quantity3 = document.querySelector( '#e4p #quantityid3' );
	var taxRate = 0.055;
	if ( $price1 && $quantity1 && $price2 && $quantity2 && $price3 && $quantity3 ) {
		let subTotal = $price1.value * $quantity1.value + $price2.value * $quantity2.value + $price3.value * $quantity3.value
		let tax = subTotal * taxRate;
		let total = (subTotal + tax).toFixed(2);
		var template = `price of item 1  : <span>${$price1.value}</span> <br>
				       quantity of item 1: <span>${$quantity1.value}</span> <br>
				       price of item 2   : <span>${$price2.value}</span> <br>
				       quantity of item 2: <span>${$quantity2.value}</span> <br>
				       price of item 3   : <span>${$price3.value}</span> <br>
				       quantity of item 3: <span>${$quantity3.value}</span> <br>
				       Subtotal: <span>${subTotal}</span> <br>
				       Tax: <span>${tax}</span> <br>
				       Total: <span>${total}</span>`;
		$outlet.innerHTML = `<p>${template}</p>`
	}
	toggleOutlet();
}


function currencyConversion( $outlet ) {
	var $amount = document.querySelector( '#e4p #amount-fromID' );
	var $rate = document.querySelector( '#e4p #rate-fromID' );
	

	if ( $amount && $rate ) {
		let result = $amount.value * $rate.value;
		var template = `<span>${$amount.value}</span> euros at an exchange rate of 
					<span>${$rate.value}</span> is <span>${result}</span> U.S. dollars.`;
		$outlet.innerHTML = `<p>${template}</p>`
		$amount.value = "";
		$rate.value = "";
	}
	toggleOutlet();
}

function computingSimpleInterest( $outlet ) {
	var $principal = document.querySelector( '#e4p #principal-ID' );
	var $rate = document.querySelector( '#e4p #rate-ID' );
	var $time = document.querySelector( '#e4p #time-ID' );

	if ( $principal && $rate && $time ) {
		$amount = $principal.value * (1 + (($rate.value / 100) * $time.value));
		var template = `After <span>${$time.value}</span> years at <span>${$rate.value}%</span>, 
					<br>the investment will be worth <span>$${amount}</span>.`;
		$outlet.innerHTML = `<p>${template}</p>`
		$principal.value = "";
		$time.value = "";
		$rate.value = "";
	}
	toggleOutlet();
}

function determiningCompoundInterest( $outlet ) {
	var $principal = document.querySelector( '#e4p #principal-ID' );
	var $rate = document.querySelector( '#e4p #rate-ID' );
	var $time = document.querySelector( '#e4p #time-ID' );
	var $number = document.querySelector( '#e4p #number-ID' );

	if ( $principal && $rate && $time && $number ) {
		amount = $principal.value * Math.pow((1 + (($rate.value / (100 * $number.value)))), ($number.value * $time.value));
		var template = `<span>$${$principal.value}</span> invested at 
						<span>${$rate.value}%</span> for 
						<span>${$time.value}</span> years compounded 
						<span>${$number.value}</span> times per year is 
						<span>$${amount.toFixed(2)}</span>.`
		$principal.value = "";
		$time.value = "";
		$rate.value = "";
		$number.value = "";
	}
	toggleOutlet();
}

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