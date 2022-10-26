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
	<div class="e4p-php">
		<h3 class="attention-voice"> PHP </h3>
		<?php include("projects/e4p/$exLink.php"); ?>
	</div>
	<div class="e4p-js">
		<h3 class="attention-voice"> JS </h3>
		<?php include("projects/e4p/$exLink.php"); ?>
	</div>
</exercise-detail>

		<script src="projects/e4p/e4p.js"></script>
		<script>
			
			var jsOutput = document.querySelector('.e4p-js .output-field');
			jsOutput.classList.add('hide');
			var jsForm = document.querySelector('.e4p-js form');
			jsForm.method = "";
			var button = document.querySelector('.e4p-js button');
			button.type = "button";
			button.name = "";
			
			button.addEventListener('click', function() {
				jsOutput.classList.remove('hide');
				<?=$funcName?>();
			});
		</script>

