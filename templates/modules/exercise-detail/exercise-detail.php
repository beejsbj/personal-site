<?php 
// if heading exists condition
	$exLink = $_GET['exercise'] ?? "saying-hello";
	$exerciseName = kebabToCapital($exLink);
	$funcName = getCamelCase($exerciseName);
?>
<exercise-detail>
	<actions-component>
		<a href="?page=e4p"><span>BACK</span></a>
		<toggle-switch>
			<radio-option>
				<input type="radio"  name="e4p-lang" value="php" id="option-php">
				<label for="option-php">php</label>
			</radio-option>
			<radio-option>
				<input type="radio" name="e4p-lang" value="js"  id="option-js">
				<label for="option-js">js</label>
			</radio-option>
			<radio-option>
				<input type="radio" name="e4p-lang" value="vue"  id="option-vue">
				<label for="option-vue">vue</label>
			</radio-option>

		</toggle-switch>
	</actions-component>
	<h2 class="loud-voice">
		<?=$exerciseName?>
	</h2>
	
	<exercise-form>
		<h3 class="attention-voice">PHP</h3>
		<?php include("projects/e4p/$exLink.php"); ?>
	</exercise-form>
</exercise-detail>

	
<script src="projects/e4p/e4p.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.13/dist/vue.js"></script>
<script src="projects/e4p/vue-e4p.js"></script>
<script>
	var $form = document.querySelector('form#e4p');
	var $heading = document.querySelector('exercise-detail > exercise-form h3');
	var $outlet = document.querySelector('div#e4p-output');
	var $toggleSwitch = document.querySelector('exercise-detail toggle-switch');
	var $submit = document.querySelector("#e4p button");
	var checkedId = localStorage.toggleSwitch
		? JSON.parse(localStorage.toggleSwitch)
		: 'option-php';

	var $checkedSwitch = document.querySelector(`exercise-detail toggle-switch #${checkedId}`);
	$checkedSwitch.checked = true;
	toggleRunner();
	$toggleSwitch.addEventListener('input', toggleRunner)

	
	function toggleRunner() {
		$checkedSwitch = $toggleSwitch.querySelector( 'input:checked' );
		localStorage.toggleSwitch = JSON.stringify( $checkedSwitch.id );
		$heading.innerHTML = $checkedSwitch.value;
		if ( $checkedSwitch.value == 'vue' ) {
			initInputs();
			$outlet.innerHTML = `{{output}}`;
			$form.classList.add('vue');
			exercise.current = new Vue(V<?=$funcName?>);
		} else {
			if (exercise.current) exercise.current.$destroy();

			if (!$form.dataset.handler) {
				$form.dataset.handler = 'true';
				$form.addEventListener('submit', function ( event ) {
					if ($checkedSwitch.value != 'php') {
						event.preventDefault();

	
					} else {
				 		$form.submit();
					}
					if ($checkedSwitch.value == 'js') {
						<?=$funcName?>($outlet);
					} else if ($checkedSwitch.value == 'vue'){
						console.log('hi');
					} 
				})
			}
			
		}
		
	}

	
</script>

