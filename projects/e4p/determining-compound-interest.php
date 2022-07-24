<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Compound Interest</title>



</head>




    
<?php
    function showPageErrors() {
        ini_set('display_errors', 1);
        ini_set('display_startup_errors', 1);
        error_reporting(E_ALL);
    }



    

    $principal = 0;
    $rate = 0;
    $time = 0;
    $number = 0;


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

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Compound Interest</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input id="principal-ID" type="text" class="text-number-input" required name="principal" placeholder="principal?" value="" min="0.01" step="0.01">
                    <label for="principal-ID">What is the principal amount?</label>
                </div>
                <div class="input-field">
                    <input id="rate-ID" type="text" class="text-number-input" required name="rate" placeholder="rate?" value="" min="0.01" step="0.01">
                    <label for="rate-ID">What is the rate?</label>
                </div>
                <div class="input-field">
                    <input id="time-ID" type="text" class="text-number-input" required name="time" placeholder="time?" value="" min="1" step="1">
                    <label for="time-ID">What is the number of years?</label>
                </div>
                <div class="input-field">
                    <input id="number-ID" type="text" class="text-number-input" required name="number" placeholder="Compound number?" value="" min="1" step="1">
                    <label for="number-ID">Times interest is compounded per year?</label>
                </div>


                <button type="submit" name="submitted">
                    Compute
                </button>


                <div class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
            </form>
        </div>
    </main>


</body>
</html>

















































