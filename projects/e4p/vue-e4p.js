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
			document.querySelector("div#e4p-output").classList.add('hide');
			document.querySelector("div#e4p-output").classList.add("output-field");
			let template = `Vue dit Bonjour, ${this.nme}`;
			if (!isInputEmpty()) {
				
				return template;
			} 
		},
	},
	methods: {
		submit(event) {
			event.preventDefault();
			document.querySelector("div#e4p-output").classList.remove('hide');
			console.log('h48i')
		},
	},
};

