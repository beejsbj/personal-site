<?php








$class = "hide";

$quote = '';
$author = '';
$output = '';


if (isset($_POST['submitted'])) {
	// code...

	if ((isset($_POST['quote'])) && (isset($_POST['author']))) {
		// code...
		if (($_POST['quote'] != '') && ($_POST['author'] != '')) {
			// code...

			$quote = $_POST['quote'];
			$author = $_POST['author'];

			$output = "<span>" . "$author" . "</span> says, <em>'" . "$quote" . "'</em>";







			$class = "output-field";
		}
	}
}











?>



<form id="e4p" autocomplete='off' method="POST">

	<div class="input-field">
		<input id="quote" type="text" class="text-number-input" required name="quote" placeholder="What is the Quote?" value="<?= $quote ?>">
		<label class="firm-voice" for="quote">What is the Quote?</label>
	</div>
	<div class="input-field">
		<input id="author" type="text" class="text-number-input" required name="author" placeholder="Who said it?" value="<?= $author ?>">
		<label class="firm-voice" for="author">Who said it?</label>
	</div>


	<button type="submit" class="button" name="submitted">
		Print
	</button>


	<output class="<?= $class ?>">
		<p><?= $output ?></p>
	</output>

</form>