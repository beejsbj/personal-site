<!-- 6 Retirement Calculator
    
    get current year from system and store into $currentYear

    take input from user for their age and the desired retirement age
    print   "What is your current age?" 
            "At what age would you like to retire?"
            
                convert input to num and store into $currentAge and $retireAge

    calculate difference between retireAge and currentAge
        store into variable. $ageDifference

    add $age difference to $currentYear, store in variable. $retireYear -->







<?php



$class = "hide";
// $class = "output-field";


$currentYear = date("Y");
$currentAge = '';
$retireAge = '';
$ageDifference = 0;
$retireYear = 0;





if (isset($_POST['submitted'])) {

	if ((isset($_POST['currentAge'])) && (isset($_POST['retireAge']))) {



		if (($_POST['currentAge'] != '') && ($_POST['retireAge'] != '')) {

			$currentAge = floatval($_POST['currentAge']);
			$retireAge = floatval($_POST['retireAge']);
			$ageDifference = $retireAge - $currentAge;
			$retireYear = $currentYear + $ageDifference;




			$output = "You have <span>$ageDifference</span> years left until you can retire.<br>
                        It's <span>$currentYear</span>, so you can retire in <span>$retireYear</span>.";









			if ($ageDifference <= 0) {
				$output = "What're you doing?! you can retire already. <br> go! go!";
			}



			$class = "output-field";
		}
	}
}











?>


<form id="e4p" autocomplete='off' method="POST">

	<div class="input-field">
		<input id="current-age" type="number" class="text-number-input" required name="currentAge" placeholder="current age?" value="<?= $currentAge ?>" min="0">
		<label class="firm-voice" for="current-age">What is your current age?</label>
	</div>
	<div class="input-field">
		<input id="retire-age" type="number" class="text-number-input" required name="retireAge" placeholder="age to retire?" value="<?= $retireAge ?>" min="0">
		<label class="firm-voice" for="retire-age">At what age would you like to retire?</label>
	</div>



	<button type="submit" class="button" name="submitted">
		Submit
	</button>


	<output class="<?= $class ?>">
		<p><?= $output ?></p>
	</output>

</form>