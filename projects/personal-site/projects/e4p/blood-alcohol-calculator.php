

    
<?php
$class = "hide";


function BACalc($gender, $weight, $number, $time){
     $ratios = [
        "male" => 0.73,
        "female" => 0.66,
    ];
    $amount = $number * 12; //12 ounces
    return ($amount * 5.14 / $weight * $ratios[$gender]) - (.015 * $time);
}



$gender = ''; //selected gender
$weight = ''; //weight in pounds
$number = ''; // number of drinks
$time = ''; //time since last drink




if (
    isset($_POST['submitted']) &&
    (isset($_POST['gender']))  && 
    ($_POST['gender'] != '')   && 
    (isset($_POST['weight']))  && 
    ($_POST['weight'] != '')   &&
    (isset($_POST['number']))  && 
    ($_POST['number'] != '')   &&
    (isset($_POST['time']))    && 
    ($_POST['time'] != '')
) {
    $gender = $_POST['gender'];
    $weight = $_POST['weight'];
    $number = $_POST['number'];
    $time = $_POST['time'];

    $result = round(BACalc($gender, $weight, $number, $time), 2);
    // $result = 0.01;


    if ($result >= 0.08) {
        $output = "Your BAC is <span>$result</span><br>
                    It is not legal for you to drive.";
    } else {
        $output = "Your BAC is <span>$result</span><br>
                    You are good to drive.";
    }



    $class = "output-field"; 
}
?>





            <form method="POST">

                <div class="radio-list">
                    <div class="input-field">
                        <input id="male-ID" type="radio" <?=isChecked($gender, 'male')?> name="gender" value="male">
                        <label for="male-ID">Male</label>
                    </div> 
                    <div class="input-field">
                        <input id="female-ID" type="radio" <?=isChecked($gender, 'female')?> name="gender" value="female">
                        <label for="female-ID">Female</label>
                    </div>   
                </div>

                <div class="input-field">
                    <input id="weight-ID" type="number" class="text-number-input" required name="weight" placeholder="weight??" value="<?=$weight?>">
                    <label for="weight-ID">Enter your weight in pounds</label>
                </div>
                <div class="input-field">
                    <input id="number-ID" type="number" class="text-number-input" required name="number" placeholder="how many drinks??" value="<?=$number?>">
                    <label for="number-ID">Enter number of drinks</label>
                </div>
                <div class="input-field">
                    <input id="time-ID" type="number" class="text-number-input" required name="time" placeholder="time??" value="<?=$time?>">
                    <label for="time-ID">how many hours since last drink?</label>
                </div>


                <button class="button-49" type="submit" name="submitted">
                    BACBAC
                </button>


                <div class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
                
            </form>
        















































