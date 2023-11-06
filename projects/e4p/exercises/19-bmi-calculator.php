<?php


$height = '';
$weight = '';
$bmi = 0;








$class = "hide";





if (
	isset($_POST['submitted']) &&
	(isset($_POST['weight']))  &&
	($_POST['weight'] != '')   &&
	(isset($_POST['height']))  &&
	($_POST['height'] != '')
) {

	$height = $_POST['height'];
	$weight = $_POST['weight'];

	$bmi = ($weight / ($height * $height)) * 703;

	if ($bmi < 18.5) {
		$output = "You are underweight. Eat more!";
	}
	if ($bmi > 25) {
		$output = "You are overweight. see your doctor.";
	}
	if ($bmi >= 18.5 && $bmi <= 25) {
		$output = "You are within the ideal weight range.";
	}


	$class = "output-field";
}
?>
<form id="e4p" autocomplete='off' method="POST">
	<div class="input-field range-field">
		<input id="height-ID" type="range" min="1" max="120" step="1" required name="height" placeholder="height??" value="<?= $height ?>">
		<label class="firm-voice" for="height-ID"> Height: <span></span>
		</label>
	</div>
	<div class="input-field range-field">
		<input id="weight-ID" type="range" min="1" max="300" step="1" required name="weight" placeholder="weight??" value="<?= $weight ?>">
		<label class="firm-voice" for="weight-ID"> Weight: <span></span>
		</label>
	</div>
	<button type="submit" class="button" name="submitted"> BMIBMI </button>
	<output class="<?= $class ?>">
		<p><?= $output ?></p>
	</output>
</form>
<script>
	const myCoolForm = document.querySelector('form');
	const rangeH = myCoolForm.querySelector('#height-ID');
	const outputH = myCoolForm.querySelector('#height-ID + label span');
	const rangeW = myCoolForm.querySelector('#weight-ID');
	const outputW = myCoolForm.querySelector('#weight-ID + label span');

	myCoolForm.addEventListener('input', function() {
		rangeHft = parseInt(rangeH.value / 12);
		rangeHin = Math.round(rangeH.value % 12);
		outputH.innerHTML = 'ft: ' + rangeHft + ' in: ' + rangeHin;
		outputW.innerHTML = rangeW.value + ' lbs';
	});
</script>