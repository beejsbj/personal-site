<!-- 

create variables for length and width.

ask user for input, check for input conditions like it being a number, non negative and actually there 
and putting that data into the variables.

calculate area and store in $area


calculate area in meters using formula and store in variable.


display both area in feet and area in meters




 -->

     <style>
        h1 {
            font-size: clamp(3.13rem, calc(1.81rem + 6.58vw), 9.38rem);
        }

        .output-field p {
            /*text-align: left; */
        }
    </style>

<?php
 





$class = "hide";
 // $class = "output-field";


$length = '';
$width = '';

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
<form id="e4p" method="POST">
    <div class="input-field radio-list">
        <div class="input-field">
            <input id="ifeet" type="radio" name="unitChoice" value="feet" checked>
            <label for="ifeet">feet</label>
        </div>
        <div class="input-field">
            <input id="imeter" type="radio" name="unitChoice" value="meter">
            <label for="imeter">meter</label>
        </div>
    </div>
    <div class="input-field">
        <input type="number" id="length" class="text-number-input" required name="length" placeholder="length??" value="<?=$length?>" step="0.01" min="1">
        <label for="length"> What is the length of the room?</label>
    </div>
    <div class="input-field">
        <input id="width" type="number" class="text-number-input" required name="width" placeholder="width??" value="<?=$width?>" step="0.01" min="1">
        <label for="width"> What is the width of the room?</label>
    </div>
    <button type="submit" name="submitted"> Calculate </button>
    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
</form>