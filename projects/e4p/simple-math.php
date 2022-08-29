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






    
<?php
 






$class = "hide";
 // $class = "output-field";


$first = '';
$second = '';
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




            <form method="POST">

                <div class="input-field">
                    <input id="first-id" type="text" class="text-number-input" required name="first" placeholder="first number?" value="<?=$first?>" step="0.01">
                    <label for="first-id">What is the first number?</label>
                </div>
                <div class="input-field">
                    <input id="second-id" type="text" class="text-number-input" required name="second" placeholder="second number?" value="<?=$second?>" step="0.01">
                    <label for="second-id">What is the second number?</label>
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



