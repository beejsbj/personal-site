<?php
 


    

    $principal = '';
    $rate = '';
    $time = '';
    $number = '';


    $amount = 0;










$class = "hide";
 // ;




if (isset($_POST['submitted'])){
        if ((isset($_POST['principal'])) && (isset($_POST['rate'])) && (isset($_POST['time'])) && (isset($_POST['number'])) ) {
        


        if (($_POST['principal'] != '') && ($_POST['rate'] != '') && ($_POST['time'] != '')&& ($_POST['number'] != '')) {

            $principal = floatval($_POST['principal']);
            $rate = floatval($_POST['rate']);
            $time = floatval($_POST['time']);
            $number = floatval($_POST['number']);



            $amount = round(($principal * pow((1 + (($rate / (100 * $number)))), ($number * $time))), 2);




            $output = "<span>$$principal</span> invested at <span>$rate%</span> for <span>$time</span> years compounded <span>$number</span> times per year is <span>$$amount</span>.";

            $class = "output-field";

        }
    }


           
           


}





    





?>
<form id="e4p" method="POST">
    <div class="input-field">
        <input id="principal-ID" type="number" class="text-number-input" required name="principal" placeholder="principal?" value="<?=$principal?>" min="0.01" step="0.01">
        <label for="principal-ID">What is the principal amount?</label>
    </div>
    <div class="input-field">
        <input id="rate-ID" type="number" class="text-number-input" required name="rate" placeholder="rate?" value="<?=$rate?>" min="0.01" step="0.01">
        <label for="rate-ID">What is the rate?</label>
    </div>
    <div class="input-field">
        <input id="time-ID" type="number" class="text-number-input" required name="time" placeholder="time?" value="<?=$time?>" min="1" step="1">
        <label for="time-ID">What is the number of years?</label>
    </div>
    <div class="input-field">
        <input id="number-ID" type="number" class="text-number-input" required name="number" placeholder="Compound number?" value="<?=$number?>" min="1" step="1">
        <label for="number-ID">Times interest is compounded per year?</label>
    </div>
    <button type="submit" name="submitted"> Determine </button>
    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
</form>