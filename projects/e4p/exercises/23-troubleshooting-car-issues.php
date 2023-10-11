<?php

$class = "hide";

if (isset($_POST['submitted'])) {


	$class = "output-field";
}
?>
<form id="e4p" autocomplete='off' method="POST">
	<div class="input-field">
		<input id="input1-ID" type="text" class="text-number-input" class="text-number-input" required name="input1" placeholder="input1??" value="<?= $input1 ?>">
		<label class="firm-voice" for="input1-ID"></label>
	</div>
	<button type="submit" name="submitted">
	</button>
	<output class="<?= $class ?>">
		<p><?= $output ?></p>
	</output>
</form>