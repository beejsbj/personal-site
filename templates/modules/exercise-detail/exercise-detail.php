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
		</toggle-switch>
		<a href="https://codepen.io/beejsbj/full/mdKpeKP/#<?=$funcName?>">Vue</a>
	</actions-component>
	<h2 class="loud-voice">
		<?=$exerciseName?>
	</h2>
	
	<exercise-form>
		<h3 class="attention-voice">PHP</h3>
		<?php include("projects/e4p/$exLink.php"); ?>
	</exercise-form>
</exercise-detail>

	

<script>
	function callForm() {
	 	<?=$funcName?>($outlet);
	} 
</script>
<script src="projects/e4p/e4p.js"></script>
