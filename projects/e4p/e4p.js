var $heading = document.querySelector("exercise-detail > exercise-form h3");
var $toggleSwitch = document.querySelector("exercise-detail toggle-switch");
var $form = document.querySelector("form#e4p");
var $outlet = $form.querySelector("output");
var $submit = $form.querySelector("button");

//looks for php or js selection
var checkedId = localStorage.toggleSwitch
	? JSON.parse(localStorage.toggleSwitch)
	: "option-php";
var $checkedSwitch = $toggleSwitch.querySelector(`#${checkedId}`);
$checkedSwitch.checked = true;
toggleRunner();

$toggleSwitch.addEventListener("input", toggleRunner);

//submit event listner
if (!$form.dataset.handler) {
	$form.dataset.handler = "true";
	$form.addEventListener("submit", function (event) {
		if ($checkedSwitch.value == "php") {
			$form.submit();
		} else {
			event.preventDefault();
			if ($checkedSwitch.value == "js") {
				callForm();
			}
		}
	});
}

function toggleRunner() {
	$checkedSwitch = $toggleSwitch.querySelector("input:checked");
	localStorage.toggleSwitch = JSON.stringify($checkedSwitch.id);
	$heading.innerHTML = $checkedSwitch.value;
	$form.dataset.lang = $checkedSwitch.value;

}

//init
function toggleOutlet() {
	$form.querySelector("output").classList.remove("hide");
}
// boiler
function exercise($outlet) {
	var $input = $form.querySelector("#input-ID");
	var template = `<span></span>`;
	$outlet.innerHTML = `<p>${template}</p>`;
	$input.value = "";
	toggleOutlet();
}
// Saying Hello -->
function sayingHello($outlet) {
	var $name = $form.querySelector("input#nme");
	if ($name) {
		var template = "hello, <span>" + $name.value + "</span> wassup?";
		$outlet.innerHTML = `<p>${template}</p>`;
		$name.value = "";
	}
	toggleOutlet();
}
// Counting the Number of Characters -->
function countingTheNumberOfCharacters($outlet) {
	var $string = $form.querySelector("input#stringID");
	// get length of $string and store it in another variable
	var stringLen = $string.value.length;
	// if length is 0, prompt user for $string agian
	if ($string) {
		// if not, template the length value
		var template = `<span>${$string.value}</span> seems to have <span>${stringLen}</span> characters.`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$string.value = "";
	}
	toggleOutlet();
}
// Printing Quotes -->
function printingQuotes($outlet) {
	var $author = $form.querySelector("input#author");
	var $quote = $form.querySelector("input#quote");
	if ($author && $quote) {
		var template = `<span>${$author.value}</span> says, <em>"${$quote.value}"</em>`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$author.value = "";
		$quote.value = "";
	}
	toggleOutlet();
}
// // Mad lib -->
function madLib($outlet) {
	var $noun = $form.querySelector("input#noun");
	var $verb = $form.querySelector("input#verb");
	var $adjective = $form.querySelector("input#adjective");
	var $adverb = $form.querySelector("input#adverb");
	if ($noun && $verb && $adjective && $adverb) {
		var template = `Do you <span>${$verb.value}</span> your <span>${$adjective.value}</span> <span>${$noun.value}</span> <span>${$adverb.value}</span>? That's hilarious!`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$noun.value = "";
		$verb.value = "";
		$adjective.value = "";
		$adverb.value = "";
	}
	toggleOutlet();
}

function simpleMath($outlet) {
	var $first = $form.querySelector("input#first-id");
	var $second = $form.querySelector("input#second-id");
	let sum = $first.value + $second.value;
	let difference = $first.value - $second.value;
	let product = $first.value * $second.value;
	let quotient = $first.value / $second.value;
	if ($first && $second) {
		var template = `<span>${$first.value}</span> + <span>${$second.value}</span> = ${sum}<br>
                        <span>${$first.value}</span> - <span>${$second.value}</span> = ${difference}<br>
                        <span>${$first.value}</span> * <span>${$second.value}</span> = ${product}<br>
                        <span>${$first.value}</span> / <span>${$second.value}</span> = ${quotient}<br>`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$first.value = "";
		$second.value = "";
	}
	toggleOutlet();
}
// // retirement calculator -->
function retirementCalculator($outlet) {
	var $currentAge = $form.querySelector("input#current-age");
	var $retireAge = $form.querySelector("input#retire-age");
	var ageDifference = $retireAge.value - $currentAge.value;
	const today = new Date();
	let currentYear = today.getFullYear();
	let retireYear = currentYear + ageDifference;
	if ($currentAge && $retireAge) {
		template = `You have <span>${ageDifference}</span> years left until you can retire.<br>
                        It's <span>${currentYear}</span>, so you can retire in <span>${retireYear}</span>.`;
		$currentAge.value = "";
		$retireAge.value = "";
	}
	if (ageDifference <= 0) {
		template = "What're you doing?! you can retire already. <br> go! go!";
	}
	$outlet.innerHTML = `<p>${template}</p>`;
	toggleOutlet();
}

function areaOfARectangularRoom($outlet) {
	var $unit = $form.querySelector(
		".radio-list input[name='unitChoice']:checked"
	);
	let $length = $form.querySelector("#length");
	let $width = $form.querySelector("#width");
	const convertConst = 0.09290304;
	console.log($unit);
	if ($unit.value == "feet") {
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
	$outlet.innerHTML = `<p>${template}</p>`;
	$length.value = "";
	$width.value = "";
	toggleOutlet();
}

function pizzaParty($outlet) {
	var $people = $form.querySelector("#people");
	var $pizzas = $form.querySelector("#pizzas");
	var $slices = $form.querySelector("#slices");
	//calculations
	var totalSlices = $pizzas.value * $slices.value;
	console.log(totalSlices);
	var slicesPerPerson = (totalSlices / $people.value).toFixed(0);
	var leftover = (totalSlices % $people.value).toFixed(0);
	//checking for plurals
	personPluraler = $people.value > 1 ? "people" : "person";
	pizzaPluraler = $pizzas.value > 1 ? "pizzas" : "pizza";
	slicePluraler = slicesPerPerson > 1 ? "slices" : "slice";
	var template = `<span>${$people.value} ${personPluraler}</span> with <span>${$pizzas.value} ${pizzaPluraler}</span>?<br>
                       So each person gets <span>${slicesPerPerson} ${slicePluraler}</span> of pizza.<br>
                       There's <span>${leftover}</span> leftover slices.`;
	$outlet.innerHTML = `<p>${template}</p>`;
	$people.value = "";
	$pizzas.value = "";
	$slices.value = "";
	toggleOutlet();
}

function paintCalculator($outlet) {
	var $length = $form.querySelector("#lengthid");
	var $width = $form.querySelector("#widthid");
	var galConst = 350;
	if ($length && $width) {
		let area = length.value * width.value;
		let gallons = area / galConst;
		var template = `You will need to purchase <span>${gallons}</span> gallons of paint to cover <span>${area}</span> square feet`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$length.value = "";
		$width.value = "";
	}
	toggleOutlet();
}

function selfCheckout($outlet) {
	//item1
	var $price1 = $form.querySelector("#priceid1");
	var $quantity1 = $form.querySelector("#quantityid1");
	//item2
	var $price2 = $form.querySelector("#priceid2");
	var $quantity2 = $form.querySelector("#quantityid2");
	//item3
	var $price3 = $form.querySelector("#priceid3");
	var $quantity3 = $form.querySelector("#quantityid3");
	var taxRate = 0.055;
	if ($price1 && $quantity1 && $price2 && $quantity2 && $price3 && $quantity3) {
		let subTotal =
			$price1.value * $quantity1.value +
			$price2.value * $quantity2.value +
			$price3.value * $quantity3.value;
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
		$outlet.innerHTML = `<p>${template}</p>`;
	}
	toggleOutlet();
}

function currencyConversion($outlet) {
	var $amount = $form.querySelector("#amount-fromID");
	var $rate = $form.querySelector("#rate-fromID");
	if ($amount && $rate) {
		let result = $amount.value * $rate.value;
		var template = `<span>${$amount.value}</span> euros at an exchange rate of 
					<span>${$rate.value}</span> is <span>${result}</span> U.S. dollars.`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$amount.value = "";
		$rate.value = "";
	}
	toggleOutlet();
}

function computingSimpleInterest($outlet) {
	var $principal = $form.querySelector("#principal-ID");
	var $rate = $form.querySelector("#rate-ID");
	var $time = $form.querySelector("#time-ID");
	if ($principal && $rate && $time) {
		$amount = $principal.value * (1 + ($rate.value / 100) * $time.value);
		var template = `After <span>${$time.value}</span> years at <span>${$rate.value}%</span>, 
					<br>the investment will be worth <span>$${amount}</span>.`;
		$outlet.innerHTML = `<p>${template}</p>`;
		$principal.value = "";
		$time.value = "";
		$rate.value = "";
	}
	toggleOutlet();
}

function determiningCompoundInterest($outlet) {
	var $principal = $form.querySelector("#principal-ID");
	var $rate = $form.querySelector("#rate-ID");
	var $time = $form.querySelector("#time-ID");
	var $number = $form.querySelector("#number-ID");
	if ($principal && $rate && $time && $number) {
		amount =
			$principal.value *
			Math.pow(
				1 + $rate.value / (100 * $number.value),
				$number.value * $time.value
			);
		var template = `<span>$${$principal.value}</span> invested at 
						<span>${$rate.value}%</span> for 
						<span>${$time.value}</span> years compounded 
						<span>${$number.value}</span> times per year is 
						<span>$${amount.toFixed(2)}</span>.`;
		$principal.value = "";
		$time.value = "";
		$rate.value = "";
		$number.value = "";
	}
	toggleOutlet();
}
// tax calculator
function taxCalculator($outlet) {
	var $amount = $form.querySelector("#amount-ID");
	var $state = $form.querySelector("#state-ID");
	const rates = [
		["wi", "wisconsin", 5.5],
		["mn", "minnesota", 6.875],
		["tx", "texas", 6.25],
		["ca", "california", 7.25],
		["al", "alabama", 4],
		["hi", "hawaii", 4],
		["me", "maine", 5.5],
	];
	if ($amount && $state) {
		var taxRate = 0;
		rates.forEach(function (rate) {
			if (rate.includes($state.value.toLowerCase())) {
				taxRate = rate[2];
			}
		});
		if (!taxRate) {
			var template = `${$state.value} doesnt exist`;
		} else {
			tax = ($amount.value * taxRate) / 100;
			total = tax + Number($amount.value);
			var template = `The subtotal is <span>${$amount.value}</span> <br>
				       The tax is <span>${tax}</span>.<br>
				       The total is <span>${total}</span>.`;
		}
		$outlet.innerHTML = `<p>${template}</p>`;
		$amount.value = "";
		$state.value = "";
	}
	toggleOutlet();
}

function passwordValidation($outlet) {
	var $username = $form.querySelector("#username-ID");
	var $password = $form.querySelector("#password-ID");
	const locker = {
		username: "password",
	};
	if ($password.value == locker[$username.value]) {
		var template = `Welcome to the cave, <span>${$username.value}</span>`;
	} else {
		var template = `password or username incorrect`;
	}
	$outlet.innerHTML = `<p>${template}</p>`;
	toggleOutlet();
}

function legalDrivingAge($outlet) {
	var $age = $form.querySelector("#age-ID");
	legalAges = {
		argentina: 17,
		brazil: 18,
		canada: 16,
		china: 18,
		denmark: 17,
		france: 18,
		india: 18,
		japan: 18,
		mexico: 18,
		niger: 23,
		salvador: 15,
		"saudi arabia": 18,
		sweden: 16,
		usa: 16,
	};
	const countries = [];
	var countriesTemplate = "";
	Object.keys(legalAges).forEach(function (country) {
		if (legalAges[country] <= $age.value) {
			country[0] = country[0].toUpperCase();
			countries.push(country);
		}
	});
	countries.forEach(function (country) {
		countriesTemplate += `<li><span>${country}</span></li>`;
	});
	var template = `You can drive in: <ul>${countriesTemplate}</ul>`;
	if (!countries.length) {
		template = "You cant drive anywhere!!";
		template = `<p>${template}</p>`;
	}
	$outlet.innerHTML = `${template}`;
	toggleOutlet();
}

function bloodAlcoholCalculator($outlet) {
	var $gender = $form.querySelector(".radio-list input[name='gender']:checked");
	var $weight = $form.querySelector("#weight-ID");
	var $number = $form.querySelector("#number-ID");
	var $time = $form.querySelector("#time-ID");
	var result = BACalc(
		$gender.value,
		$weight.value,
		$number.value,
		$time.value
	).toFixed(2);
	if (result >= 0.08) {
		var template = `Your BAC is <span>${result}</span><br>
                    It is not legal for you to drive.`;
	} else {
		var template = `Your BAC is <span>${result}</span><br>
                    You are good to drive.`;
	}
	$outlet.innerHTML = `<p>${template}</p>`;
	toggleOutlet();
}

function BACalc(gender, weight, number, time) {
	let ratios = {
		male: 0.73,
		female: 0.66,
	};
	amount = number * 12; //12 ounces
	return ((amount * 5.14) / weight) * ratios[gender] - 0.015 * time;
}
//
function temperatureConverter($outlet) {
	var $unit = $form.querySelector(".radio-list input[name='unit']:checked");
	var $temperature = $form.querySelector("#temperature-ID");
	var template = "";
	let k = 0;
	let c = 0;
	let f = 0;
	switch ($unit.value) {
		case "celcius":
			c = Number($temperature.value);
			f = (c * 9) / 5 + 32;
			k = c + 273.15;
			template = `The temperature in Farenheit is <span>${f}</span><br>
        			The temperature in Kelvin is <span>${k}</span>`;
			break;
		case "farenheit":
			f = Number($temperature.value);
			c = ((f - 32) * 5) / 9;
			k = c + 273.15;
			template = `The temperature in Celcius is <span>${c}</span><br>
   						The temperature in Kelvin is <span>${k}</span>`;
			break;
		case "kelvin":
			k = Number($temperature.value);
			c = k - 273.15;
			f = (c * 9) / 5 + 32;
			template = `The temperature in Celcius is <span>${c}</span><br>
       					The temperature in Farenheit is <span>${f}</span>`;
			break;
	}
	$outlet.innerHTML = `<p>${template}</p>`;
	toggleOutlet();
}

// BMI calculator
function bmiCalculator($outlet) {
	var $height = $form.querySelector("#height-ID");
	var $weight = $form.querySelector("#weight-ID");

	var bmi = ($weight.value / ($height.value * $height.value)) * 703;

	if (bmi < 18.5) {
		var template = "You are underweight. Eat more!";
	} else if (bmi > 25) {
		var template = "You are overweight. see your doctor.";
	} else {
		var template = "You are within the ideal weight range.";
	}

	$outlet.innerHTML = `<p>${template}</p>`;

	toggleOutlet();
}

// boiler
function multistateSalesTaxCalculator($outlet) {
	var $amount = $form.querySelector("#amount-ID");
	var $state = $form.querySelector("#state-ID");
	var $county = $form.querySelector("#county-ID");
	var taxRate = 0;
	var countyRate = 0;
	const rates = [
		["wi", "wisconsin", 5.5, { "eau claire": 0.5, dunn: 0.4 }],
		["mn", "minnesota", 6.875],
		["tx", "texas", 6.25],
		["ca", "california", 7.25, { alameda: 10.75, "los angeles": 9.5 }],
		["al", "alabama", 4, { cherokee: 10, russell: 9.875 }],
		["hi", "hawaii", 4],
		["me", "maine", 5.5],
	];
	rates.forEach(function (state) {
		console.log(state);
		if (state.includes($state.value)) {
			taxRate = state[2];
			countyRate = state[3][$county.value];
		}
	});

	var tax = ($amount.value * taxRate) / 100 + ($amount.value * countyRate) / 100;
	var total = Number($amount.value) + tax;
	var template = `The subtotal is <span>$${$amount.value}</span> <br>
						       The tax is <span>$${tax.toFixed(2)}</span> <br>
						       The total is <span>$${total}</span>`;
	$outlet.innerHTML = `<p>${template}</p>`;

	toggleOutlet();
}

//number to names
function numbersToNames($outlet) {
	var $input = $form.querySelector("#number-ID");
	const languages = ['en', 'fr', 'af', 'ko', 'sg', 'zh', 'ru', 'hi', 'es', 'ja', 'ar', 'is'];	
	

	function getMonthName(month, locale) {
	  const formatter = new Intl.DateTimeFormat(locale, { month: 'long'});
	  return formatter.format( new Date(2000, month - 1) );
	}
	var template = '';

	languages.forEach( function (lang) {
		var languageNames = new Intl.DisplayNames(['en'], {type: 'language'});
		var langaugeName = languageNames.of(lang);
		var translatedMonth = getMonthName( $input.value, lang );
		template += `<li>The name of the month in <span>${langaugeName}</span> is <span>${translatedMonth}</span>.</li>`;

	});
	$outlet.innerHTML = `<ul>${template}</ul>`;
	toggleOutlet();
}

//22
function comparingNumbers($outlet) {
	var $numbers = $form.querySelectorAll("input");
	var smallest = Number($numbers[0].value);

	$numbers.forEach( function($number) {
		let number = Number($number.value);
		if (number <= smallest) smallest = number;
	})

	var template = `the smallest number is <span>${smallest}</span>`;
	$outlet.innerHTML = `<p>${template}</p>`;
	$numbers.value = "";
	toggleOutlet();
}



//23
function troubleshootingCarIssues($outlet) {
	var $input = $form.querySelector("#input-ID");
	var template = `<span></span>`;
	$outlet.innerHTML = `<p>${template}</p>`;
	$input.value = "";
	toggleOutlet();
}


//24 anagram checker 
function anagramChecker($outlet) {
	function isAnagram(str1, str2) {
		str1 = str1.split('').sort().join('');
		str2 = str2.split('').sort().join('');
	    return str1 == str2; 
	}
	var $string1 = $form.querySelector("#string1-ID");
	var $string2 = $form.querySelector("#string2-ID");
	
	 template = `Those are NOT anagrams`;

    if ( isAnagram( $string1.value, $string2.value ) ) {
        template = `those are anagrams`; 
    }

	$outlet.innerHTML = `<p>${template}</p>`;
	$string2.value = "";
	$string1.value = "";
	toggleOutlet();
}


