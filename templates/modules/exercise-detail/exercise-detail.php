<?php 
// if heading exists condition
	$exLink = $_GET['exercise'] ?? "saying-hello";
	$exerciseName = unDasher($exLink);
	$funcName = functionNamer($exerciseName);
?>
<exercise-detail>
	<a href="?page=e4p">BACK</a>
	<h2 class="loud-voice">
		<?=$exerciseName?>
	</h2>
	<toggle-switch>
		<input type="checkbox" id="php-js">
		<label for="php-js"></label>
	</toggle-switch>
	<div>
		<h3 class="attention-voice">PHP</h3>
		<?php include("projects/e4p/$exLink.php"); ?>
	</div>
</exercise-detail>

<script src="projects/e4p/e4p.js"></script>
<script>
	var toggleSwitch = document.querySelector('exercise-detail toggle-switch input');
	var button = document.querySelector('form#e4p button');


	toggleSwitch.addEventListener('input', function() {
		var heading = document.querySelector('exercise-detail > div h3');
		var $outlet = document.querySelector('div#e4p-output');

		if (toggleSwitch.checked) {
			heading.innerHTML = 'JS';
			button.addEventListener('click', function(event) {
				event.preventDefault();

				<?=$funcName?>($outlet);
			});

		} else {
			heading.innerHTML = 'PHP';
		}
	})
	
</script>

