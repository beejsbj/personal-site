<?php
 



$amountFrom = 0;
$rateFrom= 0;

$amountTo = 0;
$rateTo = 1;






$class = "hide";
 




if (isset($_POST['submitted'])){
    
        if ((isset($_POST['amountFrom'])) && (isset($_POST['rateFrom']))) {
            if (($_POST['amountFrom'] != '') && ($_POST['rateFrom'] != '')) {

                $amountFrom = floatval($_POST['amountFrom']);
                $rateFrom = floatval($_POST['rateFrom']);

                $amountTo = round((($amountFrom * $rateFrom)/$rateTo), 2);

                $amountFrom = round(floatval($_POST['amountFrom']), 2);
                $rateFrom = round(floatval($_POST['rateFrom']), 2);




                $output = "<span>$amountFrom</span> euros at an exchange rate of <span>$rateFrom</span> is <span>$amountTo</span> U.S. dollars.";





                $class = "output-field";
            }
        }

           
           


}





    





?>
<form id="e4p" autocomplete='off' method="POST">
    <div class="input-field">
        <input id="amount-fromID" type="number" class="text-number-input" required name="amountFrom" placeholder="Euros?" min="0.01" step="0.01">
        <label for="amount-fromID">How many euros to exchange?</label>
    </div>
    <div class="input-field">
        <input id="rate-fromID" type="number" class="text-number-input" required name="rateFrom" placeholder="Euros?" min="0.000001" step="0.000001">
        <label for="rate-fromID">What is the exchange rate?</label>
    </div>
    <button type="submit" name="submitted"> Convert </button>
    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
</form>