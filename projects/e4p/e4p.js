//init
function toggleOutlet() {
	document.querySelector( 'div#e4p-output' )
		.classList.remove( 'hide' );
	document.querySelector( 'div#e4p-output' )
		.classList.add( 'output-field' );
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




// Saying Hello -->
// create function that,


function SayingHello() {
	console.log('hello')
	var name = document.querySelector('input#nme').value;
	var outputField = document.querySelector('div#e4p-output')
	if (name) {
		var output = 'hello, ' + name + ' wassup?';
		outputField.innerHTML = `<p>${output}</p>`
	} else {
		outputField.innerHTML = `<p>i asked you a question twat!</p>`
	}
}

// // Counting the Number of Characters -->
// function CharCount() {
// 	// prompt for the string, and store it in a variable
// 	var string = prompt('what is the string?')
// 	// get length of string and store it in another variable
// 	var stringLen = string.length
// 	// if length is 0, prompt user for string agian
// 	if (stringLen == 0) {
// 		alert('please type SOMETHING')
// 		charCount()
// 	} else {
// 		// if not, output the length value
// 		var output = `${string} has ${stringLen} characters.`
// 		alert(output)
// 	}
// }
// // Printing Quotes -->
// function PrintQuote() {
// 	// prompt for quote and store into varaible
// 	var quote = prompt('what is the quote?');
// 	// promt for author and store in variable
// 	var author = prompt('who is the author?');
// 	// if no input, ask for it again
// 	if (author == 0 || quote == 0) {
// 		alert('Please no blanks, try again')
// 		printQuote()
// 		// if not, print output
// 	} else {
// 		// concat quote and author into output variable
// 		var output = `${author} says, "${quote}"`;
// 		alert(output);
// 	}
// }
// // Mad lib -->
// function MadLib() {
// 	// promt for noun, adj, adv, verb and store them each in a variable
// 	var noun = prompt('what is the noun?');
// 	while (noun == "") {
// 		alert('you have to enter something');
// 		var noun = prompt('what is the noun?');
// 	}
// 	var verb = prompt('what is the verb?');
// 	while (verb == "") {
// 		alert('you have to enter something');
// 		var verb = prompt('what is the verb?');
// 	}
// 	var adjective = prompt('what is the adjective?');
// 	while (adjective == "") {
// 		alert('you have to enter something');
// 		var adjective = prompt('what is the adjective?');
// 	}
// 	var adverb = prompt('what is the adverb?');
// 	while (adverb == "") {
// 		alert('you have to enter something');
// 		var adverb = prompt('what is the adverb?');
// 	}
// 	// init output variable and interpole each of the previous variables
// 	var output = `Do you ${verb} your ${adjective} ${noun} ${adverb}? That's hilarious!`
// 	// alert the output
// 	alert(output)
// }
// // simple math -->
// function SimpleMath() {
// 	// prompt for two numbers, convert to int
// 	// 	store them each in a different variable
// 	var first = parseInt(prompt('what is the first number?'));
// 	while (first == "") {
// 		alert('you have to enter a number');
// 		var first = parseInt(prompt('what is the first number?'));
// 	}
// 	var second = parseInt(prompt('what is the second number?'));
// 	while (second == "") {
// 		alert('you have to enter a number');
// 		var second = parseInt(prompt('what is the second number?'));
// 	}
// 	// perform all 4 operations and store each result in a different variable
// 	var sum = first + second;
// 	var difference = first - second;
// 	var product = first * second;
// 	var quotient = first / second;
// 	var output = `
// ${first} + ${second} = ${sum}
// ${first} - ${second} = ${difference}
// ${first} * ${second} = ${product}
// ${first} / ${second} = ${quotient}
// `;
// 	alert(output)
// 	// concat all variables into output string variable
// }
// // retirement calculator -->
// function RetireCalc() {
// 	// prompt for current age and store in var
// 	var age = parseInt(prompt('what is the age?'));
// 	while (age == "") {
// 		alert('you have to enter a number');
// 		var age = parseInt(prompt('what is the age?'));
// 	}
// 	// promt for desired retirement age and store in var
// 	var retireAge = parseInt(prompt('at what age do you wanna retire?'));
// 	while (retireAge == "") {
// 		alert('you have to enter a number');
// 		var retireAge = parseInt(prompt('at what age do you wanna retire?'));
// 	}
// 	// store current year in var
// 	var currentYear = new Date().getFullYear();
// 	// calculate difference between current age and desired retirement age and store in var
// 	var ageDiff = retireAge - age;
// 	// add the difference to the current year
// 	var retireYear = ageDiff + currentYear;
// 	// output the result
// 	var output = `You have ${ageDiff} years left until you can retire.
// It's ${currentYear}, so you can retire in ${retireYear}.`
// 	alert(output);
// }
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