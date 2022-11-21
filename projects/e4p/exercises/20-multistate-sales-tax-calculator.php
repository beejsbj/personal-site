 
<?php
 
$amount = '';
$state = '';
$county = '';
$countyTax = 0;
$taxRate = 0;
$tax = 0;
$total = 0; 

$states = [
	['wi', 'wisconsin', 5.5, ['eau claire' => 0.5, 'dunn'=> 0.4]],
	['mn', 'minnesota', 6.875],
	['tx', 'texas', 6.25],
	['ca', 'california', 7.25, [ "alameda" => 10.750, "los angeles" => 9.5 ]],
	['al', 'alabama', 4, ["cherokee" => 10, "russell" => 9.875]],
];

$class = "hide";

if (isset($_POST['submitted'])){
	$amount = floatval($_POST['amount']);
	$state = strtolower($_POST['state']);
	$county = strtolower($_POST['county']);

	foreach ($states as $stateArr) {
		// check if given state exists in array
		if (in_array($state, $stateArr)) {

			// set tax rate based on state
		    $taxRate = $stateArr[2];
		    $countyTax = $stateArr[3][$county];
		}
	}
	// if taxrate is still 0, state doesnt exist in array
	if ($taxRate == 0) {
		$output = "state doesnt exist";
	} else {
		$tax = round(($amount * $taxRate / 100) + ($amount * $countyTax / 100), 2);
		$total = $amount + $tax;
		$output = "The subtotal is <span>$$amount</span> <br>
			       The tax is <span>$$tax</span>. <br>
			       The total is <span>$$total</span>.";
	}
	$class = "output-field";
}
?>


<form id="e4p" autocomplete='off' method="POST">
	<div class="input-field">
        <input id="amount-ID" type="number" class="text-number-input" required required name="amount" placeholder="amount??" min="0.01" step="0.01" value="<?=$amount?>">
        <label for="amount-ID">What is the order amount?</label>
    </div>
    <div class="input-field">
        <input id="state-ID" type="text" class="text-number-input" required name="state" placeholder="state??" value="<?=$state?>">
        <label for="state-ID">What is the state?</label>
    </div>
    <div class="input-field">
        <input id="county-ID" type="text" class="text-number-input" required name="county" placeholder="county??" value="<?=$county?>">
        <label for="county-ID">if WI, enter county?</label>
    </div>
    <button type="submit" name="submitted">
    	Taxify
    </button>
    <output class="<?=$class?>" >
	 <p><?=$output?></p>
</output>
    
</form>















































