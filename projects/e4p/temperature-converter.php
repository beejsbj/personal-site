<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Convert Temperature</title>



</head>




    
<?php
 
$unit = '';
$temperature = 0;
$f = 0;
$c = 0;
$k = 0;









$class = "hide";





if (
    isset($_POST['submitted']) &&
    (isset($_POST['unit']))  && 
    ($_POST['unit'] != '')   && 
    (isset($_POST['temperature']))  && 
    ($_POST['temperature'] != '')
) {
    $unit = $_POST['unit'];
    $temperature = $_POST['temperature'];


    if ($unit == 'celcius') {
        $f = ($temperature * 9 / 5) + 32;
        $k = $temperature + 273.15;
        $output = "The temperature in Farenheit is <span>$f</span><br>The temperature in Kelvin is <span>$k</span>";
    }
    if ($unit == 'farenheit') {
        $c = ($temperature - 32) * 5 / 9;
        $k = $c + 273.15;
        $output = "The temperature in Celcius is <span>$c</span><br>The temperature in Kelvin is <span>$k</span>";
    }
    if ($unit == 'kelvin') {
        $c = $temperature - 273.15;
        $f = ($c * 9 / 5) + 32;
        $output = "The temperature in Celcius is <span>$c</span><br>The temperature in Farenheit is <span>$f</span>";
    }



    $class = "output-field"; 
}
?>



<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Temperature Converter</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="radio-list">
                    <div class="input-field">
                        <input id="celcius-ID" type="radio" name="unit" value="celcius">
                        <label for="celcius-ID">Celcius</label>
                    </div>
                    <div class="input-field">
                        <input id="farenheit-ID" type="radio" name="unit" value="farenheit">
                        <label for="farenheit-ID">Farenheit</label>
                    </div>
                    <div class="input-field">
                        <input id="kelvin-ID" type="radio" name="unit" value="kelvin">
                        <label for="kelvin-ID">Kelvin</label>
                    </div>
                </div>

                <div class="input-field">
                    <input id="temperature-ID" type="text" class="text-number-input" required step="0.1" name="temperature" placeholder="temperature??" value="">
                    <label for="temperature-ID">temperature in selected unit?</label>
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

















































