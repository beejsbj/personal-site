
<?php
function showPageErrors() {
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);
}

showPageErrors();

$tip = 0;
$subtotal = 0;




if (isset($_POST['submitted'])){
	

	$subtotal = $_POST["subtotal"];
	$tip = $_POST["tip"];



	$tipAmount = floatval($subtotal) * floatval($tip);
	$total = $subtotal + $tipAmount;

	





?>


<style>
	body {
		background: wheat;
		padding: 25px;
	}

	.field {
		margin-top: 1em;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5em;
	}

	label {
		font-size: 1.1rem;
	}

	button {
		margin-top: 1em;
	}

	h3 {
		/*border: 3px solid black;*/
		
	}


</style>


<form method='POST'>
	

	<h1>calculating the tip</h1>

	<div class='field'>
		<label for=''>subtotal amount</label>
		<input type="text" name="subtotal" value="<?=$subtotal?>">
	</div>

	<div class='field'>
		<label for=''>tip percentage</label>
		<input type='text' name="tip" value="<?=$tip?>">
	</div>

	<button type='submit' name="submitted">
		calculate
	</button>

</form>



<?php 
	
	echo "<h3>$total</h3>";

} ?>


