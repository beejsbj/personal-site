<!-- 

create variables for length and width.

ask user for input, check for input conditions like it being a number, non negative and actually there 
and putting that data into the variables.

calculate area and store in $area


calculate area in meters using formula and store in variable.


display both area in feet and area in meters




 -->





<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Area of a Room</title>

    <style>
        h1 {
            font-size: clamp(3.13rem, calc(1.81rem + 6.58vw), 9.38rem);
        }

        .output-field p {
            /*text-align: left; */
        }
    </style>



</head>




    
<?php
 





$class = "hide";
 // $class = "output-field";


$length = 0;
$width = 0;

$areaInFeet = 0;
$areaInMeter = 0;
$convertConst = 0.09290304;





if (isset($_POST['submitted'])){
    
    if ((isset($_POST['length'])) && (isset($_POST['width'])) && (isset($_POST['unitChoice']))) {
        


        if (($_POST['length'] != '') && ($_POST['width'] != '') && ($_POST['unitChoice'] != '')) {


            $unitChoice = $_POST['unitChoice'];

            $length = floatval($_POST['length']);
            $width = floatval($_POST['width']);



            if ($unitChoice == "feet") {

                $areaInFeet = $length * $width;
                $areaInMeter = $areaInFeet * $convertConst;
                $areaInMeter = round($areaInMeter, 3);

                $output = "The area is<br>
                        <span>$areaInFeet</span> square feet<br>
                        <span>$areaInMeter</span> square meters";
            } else {

                $areaInMeter = $length * $width;
                $areaInFeet = $areaInMeter / $convertConst;
                $areaInFeet = round($areaInFeet, 3);

                $output = "The area is<br>
                        <span>$areaInMeter</span> square meters<br>
                        <span>$areaInFeet</span> square feet";
            }

        





            $class = "output-field";

        }

    }

           
           


}





    





?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Area of a Rectangular&nbspRoom</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">
                <div class="input-field radio-list">
                    <div class="input-field">
                        <input type="radio" name="unitChoice" value="feet">
                        <label for="">feet</label>
                    </div>
                    <div class="input-field">
                        <input type="radio" name="unitChoice" value="meter"> 
                        <label for="">meter</label>
                    </div>
                </div>
                <div class="input-field">
                    <input type="number" name="length" placeholder="length??" value="" step="0.01" min="1">
                    <label for=""> What is the length of the room?</label>
                </div>
                <div class="input-field">
                    <input type="number" name="width" placeholder="width??" value="" step="0.01"  min="1">
                    <label for=""> What is the width of the room?</label>
                </div>
                


                <button type="submit" name="submitted">
                    Calculate
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









































