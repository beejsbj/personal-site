<!-- 2 Counting the Number of Characters

	take input from user and store in $string
		if string is empty, print "please enter something"
	
	use for loop to go through string to store character count in $count

		trigger it each time user inputs something into field

	initiiliaze $message and store "$string has $count characters"

	print $message. -->

<style>
	h1 {
		font-size: clamp(70px, 8vw, 150px);
	}
</style>


<?php








$class = "hide";



$inputString = '';
$output = '';
$count = 0;


function charCounter($string)
{
	$counter = 0;

	for ($i = 0; $i < strlen($string); $i++) {  //tara dog

		$char = $string[$i]; // 

		if ($char != ' ') {
			$counter++;
		}
	}

	return $counter;
}


if (isset($_POST['submitted'])) {

	if (isset($_POST['inputString'])) {

		if ($_POST['inputString'] != '') {



			$inputString = $_POST['inputString'];

			$count = charCounter($inputString);

			$output = "<span>'$inputString'</span> has <span>$count</span> characters.";



			$class = "output-field";
		}
	}
}

?>

<form id="e4p" autocomplete='off' method="POST">

	<div class="input-field">
		<input id="stringID" type="text" class="text-number-input" required name="inputString" placeholder="What is the input string?" value="<?= $inputString ?>">
		<label class="firm-voice" for="stringID">What is the input string?</label>
	</div>


	<button type="submit" class="button" name="submitted">
		Count
	</button>


	<output class="<?= $class ?>">
		<p><?= $output ?></p>
	</output>

</form>