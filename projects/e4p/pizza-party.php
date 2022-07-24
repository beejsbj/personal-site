<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Party at my Pizza</title>



</head>




    
<?php
 











$class = "hide";
 // $class = "output-field";

$people = 0;
$pizza = 0;
$slicesPerPizza = 0;
$totalSlices = 0;
$slicesPerPerson = 0;

$leftover = 0;


$personPluraler = "person";
$pizzaPluraler = "pizza";
$slicePluraler = "slice";



if (isset($_POST['submitted'])){
    
    if ((isset($_POST['people'])) && (isset($_POST['pizza'])) && (isset($_POST['slicesPerPizza']))) {
        


        if (($_POST['people'] != 0) && ($_POST['pizza'] != 0) && ($_POST['slicesPerPizza'] != 0)) {

            $people = floatval($_POST['people']);
            $pizza = floatval($_POST['pizza']);
            $slicesPerPizza = floatval($_POST['slicesPerPizza']);




            $totalSlices = $pizza * $slicesPerPizza;

            $slicesPerPerson = $totalSlices / $people;
            $slicesPerPerson = round($slicesPerPerson, 0);

            $leftover = $totalSlices % $people;
            $leftover = round($leftover, 0);


            if ($pizza > 1) {
                $pizzaPluraler = "pizzas";
            }
            if ($people > 1) {
                $personPluraler = "people";
            }
            if ($slicesPerPerson > 1) {
                $slicePluraler = "slices";
            }






            $output = "<span>$people $personPluraler</span> with <span>$pizza $pizzaPluraler</span>?<br>
                       So each person gets <span>$slicesPerPerson $slicePluraler</span> of pizza.<br>
                       There's <span>$leftover</span> leftover slices.";







            $class = "output-field";

        }

    }

           
           


}






    





?>









<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Pizza Party</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input type="text" class="text-number-input" required name="people" placeholder="How many people?" value="">
                    <label for="">How many people?</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="pizza" placeholder="How many pizzas?" value="">
                    <label for="">How many pizzas do you have?</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="slicesPerPizza" placeholder="How many slices?" value="">
                    <label for="">How many slices does each pizza have?</label>
                </div>


                <button type="submit" name="submitted">
                    Slice!
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

















































