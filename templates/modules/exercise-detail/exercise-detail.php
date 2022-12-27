<?php 
// if heading exists condition
	$exLink = $_GET['exercise'] ?? "01-saying-hello";
	$exerciseName = getTitleCase( substr($exLink, 3) );
	$funcName = getCamelCase( $exerciseName );
?>
<exercise-detail>
	<actions-component>
		<a class="" href="?page=e4p"><span>BACK</span></a>
		<toggle-switch class='radio-list'>
			<radio-option>
				<input type="radio"  name="e4p-lang" value="php" id="option-php">
				<label for="option-php">PHP</label>
			</radio-option>
			<radio-option>
				<input type="radio" name="e4p-lang" value="js"  id="option-js">
				<label for="option-js">JS</label>
			</radio-option>
			<a href="?page=e4p-in-vue#<?=$funcName?>" target="vueforms" class="new-tab">
				Vue <?php include('images/new-tab.php'); ?>
			</a>
		</toggle-switch>
		
	</actions-component>
	<h2 class="loud-voice">
		<?=$exerciseName?>
	</h2>
	
	<exercise-form>
		<h3 class="attention-voice">PHP</h3>
		<?php include("projects/e4p/exercises/$exLink.php"); ?>
	</exercise-form>
</exercise-detail>

	

<script>
	function callForm() {
	 	<?=$funcName?>($outlet);
	} 
</script>
<script src="projects/e4p/e4p.js"></script>
