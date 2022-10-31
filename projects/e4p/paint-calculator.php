


    
<?php
 











$class = "hide";
 // $class = "output-field";




$length = '';
$width = '';
$area = 0;
$gallons = 0;

$convertToGalConst = 350;





if (isset($_POST['submitted'])){ 
    if ((isset($_POST['length'])) && (isset($_POST['width']))) {
        if (($_POST['length'] != '') && ($_POST['width'] != '')) {




            $length = floatval($_POST['length']);
            $width = floatval($_POST['width']);




            $area = ceil($length * $width);
            $gallons = ceil($area / $convertToGalConst);

            $output = "You will need to purchase <span>$gallons</span> gallons of paint to cover <span>$area</span> square feet";
            

        





            $class = "output-field";

        }

    }
}


    





?>


            <form id="e4p" method="POST">
                <!-- <div class="input-field radio-list">
                    <div class="input-field">
                        <input type="radio" name="unitChoice" value="feet">
                        <label for="">feet</label>
                    </div>
                    <div class="input-field">
                        <input type="radio" name="unitChoice" value="meter"> 
                        <label for="">meter</label>
                    </div>
                </div> -->
                <div class="input-field">
                    <input id="lengthid" type="text" class="text-number-input" required name="length" placeholder="length??" value="<?=$length?>" step="0.1" min="1">
                    <label for="lengthid"> What is the length?</label>
                </div>

                <div class="input-field">
                    <input id="widthid" type="text" class="text-number-input" required name="width" placeholder="width??" value="<?=$width?>" step="0.1"  min="1">
                    <label for="widthid"> What is the width?</label>
                </div>


                <button type="submit" name="submitted">
                    Calculator
                </button>


                <div id="e4p-output" class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
                
            </form>













































