<?php
$greetings = [

    "burooj" => "Welcome back, Sir",
    "ivy" => "your glasses are cool",
    "steve" => "Excited for Love and Thunder!?",
    "jesse" => "Go to the Merry!!",
    "brian" => "that slant gave me nightmares",
    "andy" => "How're Woody and Buzz doing?",
    "derek" => "Sheriffff, we need your help!!",
    "joshua" => "does Josh work too?",
    "josh" => "Uaa! it does!!",
    "john" => "the Everything welcomes you Mr Miyao",
    "ned" => "Heya Ned, How was your last gig?",
    "tara" => "Happy house hunting!",
];

$userName = '';
$output = '';
$class = "hide";



if (isset($_POST['submitted'])){
    

    if (isset($_POST['userName'])) {
        if ($_POST['userName'] != '') {

            $userName = $_POST["userName"];
            $class = "output-field";
            $output = "Hello, <span>$userName</span>, welcome to the internet!";


            if (isset($greetings[strtolower($userName)])) {

                $output = $greetings[strtolower($userName)];

            } 
        }
    }


}
?>

<form id="e4p" method="POST">
    <div class="input-field">
        <input id="nme" type="text" class="text-number-input" required required name="userName" placeholder="What is your name?">
        <label for="nme">What is your name?</label>
    </div>
    <button type="submit" name="submitted"> Who? </button>
    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
</form>