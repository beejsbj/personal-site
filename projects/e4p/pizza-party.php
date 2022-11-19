<?php

$class = "hide";
// $class = "output-field";

$people = "";
$pizza = "";
$slicesPerPizza = "";
$totalSlices = 0;
$slicesPerPerson = 0;

$leftover = 0;

$personPluraler = "person";
$pizzaPluraler = "pizza";
$slicePluraler = "slice";

if (isset($_POST["submitted"])) {
    if (
        isset($_POST["people"]) &&
        isset($_POST["pizza"]) &&
        isset($_POST["slicesPerPizza"])
    ) {
        if (
            $_POST["people"] != 0 &&
            $_POST["pizza"] != 0 &&
            $_POST["slicesPerPizza"] != 0
        ) {
            $people = floatval($_POST["people"]);
            $pizza = floatval($_POST["pizza"]);
            $slicesPerPizza = floatval($_POST["slicesPerPizza"]);

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
<form id="e4p" autocomplete='off' method="POST">
    <div class="input-field">
        <input id="people" type="number" class="text-number-input" required name="people" placeholder="How many people?" value="<?= $people ?>">
        <label for="people">How many people?</label>
    </div>
    <div class="input-field">
        <input id="pizzas" type="number" class="text-number-input" required name="pizza" placeholder="How many pizzas?" value="<?= $pizza ?>">
        <label for="pizzas">How many pizzas do you have?</label>
    </div>
    <div class="input-field">
        <input id="slices" type="number" class="text-number-input" required name="slicesPerPizza" placeholder="How many slices?" value="<?= $slicesPerPizza ?>">
        <label for="slices">How many slices does each pizza have?</label>
    </div>
    <button type="submit" name="submitted"> Slice! </button>
    <output class="<?=$class?>" >
         <p><?=$output?></p>
    </output>
</form>
