<!-- 5 Simple Math

    initialize variables, $first, $second, $sum, $difference, $product, $quotient. set them all to 0

    
    display "What is the first number? "
                store input in $first

            "What is the second number?"
                store inpit in $second



        if user inputs non-digits, alert "please enter only numbers"


        store the sum, difference, product and quotient of $first and $second into variables  $sum, $difference, $product, $quotient respectivly.

        trigger each time user inputs anything into either field.

        print    
            "$first + $second = $sum"
            "$first - $second = $difference"
            "$first * $second = $product"
            "$first / $second = $quotient" -->

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Math is Simple!</title>

    <style>
        sup {
            /*color: yellow;*/
            vertical-align: top;
            font-size: 1.3rem;
            margin: 1px;
        }
        sub {
            /*color: yellow;*/
            vertical-align: bottom;
            font-size: 1.3rem;
            margin: 1px
        }
    </style>

</head>




    
<?php
function showPageErrors() {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}



showPageErrors();


$class = "hide";
 // $class = "output-field";


$first = 0;
$second = 0;
$sum = 0;
$difference = 0;
$product = 0;
$quotient = 0;






if (isset($_POST['submitted'])){
    
    if ((isset($_POST['first'])) && (isset($_POST['second']))) {
        


        if (($_POST['first'] != '') && ($_POST['second'] != '')) {

            $first = floatval($_POST['first']);
            $second = floatval($_POST['second']);
            $sum = $first + $second;
            $difference = $first - $second;
            $product = $first * $second;
            $quotient = round($first / $second, 2);

            $output = "<span>$first</span> + <span>$second</span> = $sum<br>
                        <span>$first</span> - <span>$second</span> = $difference<br>
                        <span>$first</span> * <span>$second</span> = $product<br>
                        <span>$first</span> / <span>$second</span> = $quotient<br>";







            $class = "output-field";

        }

    }

           
           


}





    





?>



<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Simple Math</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input type="number" name="first" placeholder="first number?" value="" step="0.01">
                    <label for="">What is the first number?</label>
                </div>
                <div class="input-field">
                    <input type="number" name="second" placeholder="second number?" value="" step="0.01">
                    <label for="">What is the second number?</label>
                </div>


                <button type="submit" name="submitted">
                    <sub>+</sub><sup>-</sup>Mathify!<sup>×</sup><sub>÷</sub>
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



