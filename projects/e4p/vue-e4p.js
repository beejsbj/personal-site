function initInputs() {
	var $inputs = document.querySelectorAll("#e4p input");	
	$inputs.forEach(function ($input) {
		$input.setAttribute("v-model", $input.id);
	});	
	$submit.setAttribute("v-on:click", "submit")
}

function isInputEmpty() {
	var $inputs = document.querySelectorAll("#e4p input");
	for (var i = 0; i < $inputs.length; i++) {
		if ( $inputs[ i ].value == "" ) {
			return true;
		}
	}
	return false;
}



var exercise = {};



var VsayingHello = {
	el: "#e4p.vue",

	data: function () {
		return {
			nme: "",
		};
	},
	computed: {
		output() {
			document.querySelector("form output").classList.add('hide');
			let template = `<p>Vue dit Bonjour, ${this.nme}</p>`;
			if (!isInputEmpty()) {
				
				return template;
			} 
		},
	},
	methods: {
		submit(event) {
			event.preventDefault();
			document.querySelector("form output").classList.remove('hide');
		},
	},
};

var VcountingTheNumberOfCharacters = {
	el: "#e4p.vue",

	data: function () {
		return {
			stringID: "",
		};
	},

	computed: {
		output() {
			// document.querySelector("form output").classList.add('hide');
			let template = `Length of string: <span>${this.stringID.length}</span>`;
			return `<p>${template}</p>`
		},
	},

	methods: {
		submit() {
			event.preventDefault();
			document.querySelector("form output").classList.remove('hide');
		}
	}

}

