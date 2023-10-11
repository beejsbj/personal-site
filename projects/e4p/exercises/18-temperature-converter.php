<?php

$unit = '';
$temperature = '';
$f = 0;
$c = 0;
$k = 0;









$class = "hide";





if (
	isset($_POST['submitted']) &&
	(isset($_POST['unit']))  &&
	($_POST['unit'] != '')   &&
	(isset($_POST['temperature']))  &&
	($_POST['temperature'] != '')
) {
	$unit = $_POST['unit'];
	$temperature = $_POST['temperature'];


	if ($unit == 'celcius') {
		$f = ($temperature * 9 / 5) + 32;
		$k = $temperature + 273.15;
		$output = "The temperature in Farenheit is <span>$f</span><br>The temperature in Kelvin is <span>$k</span>";
	}
	if ($unit == 'farenheit') {
		$c = round(($temperature - 32) * 5 / 9, 2);
		$k = $c + 273.15;
		$output = "The temperature in Celcius is <span>$c</span><br>The temperature in Kelvin is <span>$k</span>";
	}
	if ($unit == 'kelvin') {
		$c = $temperature - 273.15;
		$f = ($c * 9 / 5) + 32;
		$output = "The temperature in Celcius is <span>$c</span><br>The temperature in Farenheit is <span>$f</span>";
	}



	$class = "output-field";
}
?>

<form id="e4p" autocomplete='off' method="POST">

	<div class="radio-list horizontal">
		<div class="input-field">
			<input id="celcius-ID" type="radio" <?= ($unit == 'celcius') ? 'checked' : null ?> name="unit" value="celcius">
			<label for="celcius-ID">Celcius</lawbel>
		</div>
		<div class="input-field">
			<input id="farenheit-ID" type="radio" <?= ($unit == 'farenheit') ? 'checked' : null ?> name="unit" value="farenheit">
			<label for="farenheit-ID">Farenheit</label>
		</div>
		<div class="input-field">
			<input id="kelvin-ID" type="radio" <?= ($unit == 'kelvin') ? 'checked' : null ?> name="unit" value="kelvin">
			<label for="kelvin-ID">Kelvin</label>
		</div>
	</div>

	<div class="input-field">
		<input id="temperature-ID" type="number" class="text-number-input" required step="0.1" name="temperature" placeholder="temperature??" value="<?= $temperature ?>">
		<label class="firm-voice" for="temperature-ID">temperature in selected unit?</label>
	</div>

	<button type="submit" name="submitted">
		Convert
	</button>
	<output class="<?= $class ?>">
		<p><?= $output ?></p>
	</output>

</form>