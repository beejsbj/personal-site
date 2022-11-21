//1
const sayingHello = new Vue({
	el: "#saying-hello form",

	data() {
		return {
			name: "",
			output: ""
		};
	},
	methods: {
		submit() {
			this.output = `Bonjour ${this.name}`;
		}
	},
	watch: {
		output() {}
	}
});

//2
const CountingChars = new Vue({
	el: "#char-count form",
	data() {
		return {
			string: ""
		};
	},
	computed: {
		length() {
			return this.string.length;
		}
	}
});

//
const printingQuotes = new Vue({
	el: "#printing-quotes form",
	data() {
		return {
			quote: "",
			author: "",
			output: false
		};
	},
	watch: {
		author(newInput, oldInput) {
			if (newInput != oldInput) {
				this.output = false;
			}
		},
		quote(newInput, oldInput) {
			if (newInput != oldInput) {
				this.output = false;
			}
		}
	},
	methods: {
		submit() {
			this.output = true;
		}
	}
});

//
const madLib = new Vue({
	el: "#mad-lib form",
	data() {
		return {
			noun: "",
			verb: "",
			adjective: "",
			adverb: "",
			output: false
		};
	},
	methods: {
		submit() {
			this.output = true;
			// this.output = `Do you ${this.verb} your ${this.adjective} ${this.noun} ${this.adverb}? That's hilarious!`;
		}
	}
});

//
const simpleMath = new Vue({
	el: "#simpleMath form",
	data() {
		return {
			first: "",
			second: "",
			output: false
		};
	},
	computed: {
		sum() {
			return this.first + this.second;
		},
		difference() {
			return this.first - this.second;
		},
		product() {
			return this.first * this.second;
		},
		quotient() {
			return this.first / this.second;
		},
		modulo() {
			return this.first % this.second;
		},
		power() {
			return this.first ** this.second;
		}
	},
	methods: {
		submit() {
			this.output = true;
		}
	}
});

//
const retirementCalculator = new Vue({
	el: "#retirementCalculator form",
	data() {
		return {
			currAge: "",
			retireAge: "",
			output: false
		};
	},
	watch: {
		retireAge(newInput, oldInput) {
			if (newInput != oldInput) {
				this.output = false;
			}
		},
		currAge(newInput, oldInput) {
			if (newInput != oldInput) {
				this.output = false;
			}
		}
	},
	methods: {
		submit() {
			let ageDiff = this.retireAge - this.currAge;
			let today = new Date();

			let year = today.getFullYear();
			console.log(year);
			this.output = `You have ${ageDiff} years left until you can retire.
       						It's ${year}, so you can retire in ${year + ageDiff}.`;
		}
	}
});

//7

const areaOfARectangularRoom = new Vue({
	el: "#areaOfARectangularRoom form",
	data() {
		return {
			length: "",
			width: "",
			unit: "feet",
			convConst: 0.09290304,
			output: false
		};
	},
	watch: {
		width(newInput, oldInput) {
			if (newInput != oldInput) {
				this.output = false;
			}
		},
		length(newInput, oldInput) {
			if (newInput != oldInput) {
				this.output = false;
			}
		}
	},
	computed: {
		inFeet() {
			return this.unit == "meter"
				? ((this.length * this.width) / this.convConst).toFixed(2)
				: this.length * this.width;
		},
		inMeter() {
			return this.unit == "feet"
				? (this.length * this.width * this.convConst).toFixed(2)
				: this.length * this.width;
		}
	},
	methods: {
		submit() {
			this.output = true;
		}
	}
});

//8

const pizzaParty = new Vue({
	el: "#pizzaParty form",
	data() {
		return {
			people: "",
			pizzas: "",
			slices: "",
			output: false
		};
	},
	computed: {
		leftovers() {
			let leftovers = this.totalSlices() % this.people;
			if (leftovers > 1) {
				return `There are ${leftovers} leftover slices remaining.`;
			}
			if (leftovers < 1) {
				return `There are no leftover slices remaining.`;
			}
			if (leftovers == 1) {
				return `There is one leftover slice remaining.`;
			}
		},
		getSlices() {
			return (this.totalSlices() / this.people).toFixed(0);
		},
		slice() {
			return this.getSlices < 2 ? "slice" : "slices";
		},
		pizza() {
			return this.pizzas < 2 ? "pizza" : "pizzas";
		}
	},
	methods: {
		totalSlices() {
			return this.pizzas * this.slices;
		},
		submit() {
			this.output = true;
		}
	}
});

//9
const paintCalculator = new Vue({
	el: "#paintCalculator form",
	data() {
		return {
			lengthPaint: "",
			widthPaint: "",
			radiusPaint: "",
			isRound: false,
			shape: "rectangle",
			output: false
		};
	},
	watch: {
		shape(newInput) {
			this.output = false;
			this.isRound = false;
			if (newInput == "round") {
				this.isRound = true;
			}
		}
	},
	computed: {
		area() {
			return this.isRound
				? this.radiusPaint * this.radiusPaint * 3.14
				: this.lengthPaint * this.widthPaint;
		},
		gallons() {
			return Math.ceil(this.area / 350);
		},
		gallon() {
			return this.gallons > 1 ? "gallons" : "gallon";
		}
	},
	methods: {
		submit() {
			this.output = true;
		}
	}
});

//10
const selfCheckout = new Vue({
	el: "#selfCheckout form",
	data() {
		return {
			price: "",
			quantity: "",
			items: [],
			output: false
		};
	},
	watch: {},
	computed: {
		total() {
			return this.items.reduce(function (total, item) {
				return total + item.total;
			}, 0);
		}
	},
	methods: {
		add() {
			let item = {
				price: this.price,
				quantity: this.quantity,
				total: this.price * this.quantity
			};
			this.items.push(item);
			this.price = "";
			this.quantity = "";
			this.$refs.price.focus()
		},
		submit() {
			this.output = true;
			
		}
	}
});

//11
const currencyConversion = new Vue({
	el: "#currencyConversion form",
	data() {
		return {
			from: "",
			rate: "",
			output: false
		};
	},
	computed: {
		result() {
			return (this.from * (this.rate / 100)).toFixed(2)
		}
	},
	methods: {
		submit() {
			this.output = true;
		}
	}
});

//12 
