<?php include('functions.php'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Simple Interest</title>



</head>




    
<?php




    

    $principal = '';
    $rate = '';
    $time = '';
    $amount = 0;










$class = "hide";
 // ;




if (isset($_POST['submitted'])){
        if ((isset($_POST['principal'])) && (isset($_POST['rate'])) && (isset($_POST['time'])) ) {
        


        if (($_POST['principal'] != '') && ($_POST['rate'] != '') && ($_POST['time'] != '')) {

            $principal = floatval($_POST['principal']);
            $rate = floatval($_POST['rate']);
            $time = floatval($_POST['time']);


            $amount = round(($principal * (1 + (($rate / 100) * $time))), 2);




            $output = "After <span>$time</span> years at <span>$rate%</span>, the investment will be worth <span>$$amount</span>.";

            $class = "output-field";

        }
    }


           
           


}





    





?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Simple Interest</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input id="principal-ID" type="text" class="text-number-input" required name="principal" placeholder="principal?" value="<?=$principal?>" min="0.01" step="0.01">
                    <label for="principal-ID">Enter the principal</label>
                </div>
                <div class="input-field">
                    <input id="rate-ID" type="text" class="text-number-input" required name="rate" placeholder="rate?" value="<?=$rate?>" min="0.01" step="0.01">
                    <label for="rate-ID">Enter the rate of interest</label>
                </div>
                <div class="input-field">
                    <input id="time-ID" type="text" class="text-number-input" required name="time" placeholder="time?" value="<?=$time?>" min="1" step="1">
                    <label for="time-ID">Enter the number of years</label>
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

















































