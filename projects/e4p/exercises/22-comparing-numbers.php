<?php

$numbers = ['', '', ''];
$output = '';
$largest = '';
$class = "hide";


if (  isset( $_POST[ 'submitted' ] ) ) {

    $numbers = [ $_POST["first"], $_POST["second"], $_POST["third"] ];

    $largest = max($numbers);

    $output = 'The largest number is <span>51</span>.';
    $class = "output-field"; 
}
?>
<form id="e4p" autocomplete='off' method="POST">
    <div class="input-field">
        <input id="first-ID" type="number" class="text-number-input" class="text-number-input" required name="first" placeholder="5..." value="<?=$numbers[0]?>">
        <label for="first-ID">Enter the first number</label>
    </div>

    <div class="input-field">
        <input id="second-ID" type="number" class="text-number-input" class="text-number-input" required name="second" placeholder="51..." value="<?=$numbers[1]?>">
        <label for="second-ID">Enter the second number</label>
    </div>

    <div class="input-field">
        <input id="third-ID" type="number" class="text-number-input" class="text-number-input" required name="third" placeholder="21..." value="<?=$numbers[2]?>">
        <label for="third-ID">Enter the third number</label>
    </div>

    <button type="submit" name="submitted">
        Compare
    </button>

    <output class="<?=$class?>" >
	   <p><?=$output?></p>
    </output>
</form>