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
			<input type="checkbox" id="php-js">
			<label for="php-js"></label>
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
<script>
	var $toggleSwitch = document.querySelector('exercise-detail toggle-switch input');
	var $form = document.querySelector('form#e4p');
	var $heading = document.querySelector('exercise-detail > exercise-form h3');
	var $outlet = document.querySelector('div#e4p-output');

	$toggleSwitch.checked = localStorage.toggleSwitch
		? JSON.parse(localStorage.toggleSwitch)
		: false;
	toggleRunner();
	$toggleSwitch.addEventListener('input', toggleRunner)
	$form.addEventListener('submit', function (event) {
			if ($toggleSwitch.checked) {
				event.preventDefault();
				<?=$funcName?>($outlet);
			} else {
				$form.submit();
			}
		})
	function toggleRunner() {
		localStorage.toggleSwitch = JSON.stringify( $toggleSwitch.checked );
		$heading.innerHTML = ($toggleSwitch.checked) ? 'JS' : 'PHP';
		
	}
	
</script>

