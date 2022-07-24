<?php include('functions.php'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Convert Currency</title>

</head>




    
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

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Currency Conversion</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input id="amount-fromID" type="text" class="text-number-input" required name="amountFrom" placeholder="Euros?" min="0.01" step="0.01">
                    <label for="amount-fromID">How many euros to exchange?</label>
                </div>
                <div class="input-field">
                    <input id="rate-fromID" type="text" class="text-number-input" required name="rateFrom" placeholder="Euros?" min="0.000001" step="0.000001">
                    <label for="rate-fromID">What is the exchange rate?</label>
                </div>



                <button type="submit" name="submitted">
                    Convert
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

















































