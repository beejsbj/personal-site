<?php
// if heading exists condition
$exercise = $_GET['exercise'] ?? 1;
$exercise = isset($_GET['exercise']) ? getExercise($_GET['exercise']) : getExercise(1);

$exerciseName = $exercise['name'];
$exerciseSlug = $exercise['number'] . "-" . getKebabCase($exerciseName);

$funcName = getCamelCase($exerciseName);

if (!exExists($exerciseSlug)) {
	$notFoundHeading = 'Exercise';
	include('templates/pages/pageNotFound.php');
} else {
?>
	<exercise-detail>
		<actions-component>
			<a class="" href="?page=e4p"><span>BACK</span></a>
			<toggle-switch class='radio-list'>
				<radio-option>
					<input type="radio" name="e4p-lang" value="php" id="option-php">
					<label for="option-php">PHP</label>
				</radio-option>
				<radio-option>
					<input type="radio" name="e4p-lang" value="js" id="option-js">
					<label for="option-js">JS</label>
				</radio-option>
				<a href="?page=e4p-in-vue#<?= $funcName ?>" target="vueforms" class="new-tab hide">
					Vue <?php include('images/new-tab.php'); ?>
				</a>
			</toggle-switch>

		</actions-component>
		<h2 class="loud-voice">
			<?= $exerciseName ?>
		</h2>

		<exercise-form>
			<h3 class="attention-voice">PHP</h3>
			<?php include("projects/e4p/exercises/$exerciseSlug.php"); ?>
		</exercise-form>
	</exercise-detail>



	<script>
		function callForm() {
			<?= $funcName ?>($outlet);
		}
	</script>
	<script src="projects/e4p/e4p.js"></script>
<?php } ?>