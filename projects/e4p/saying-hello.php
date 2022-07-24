<?php include('functions.php'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Hello!</title>



</head>




    
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
$message = '';
$class = "hide";



if (isset($_POST['submitted'])){
    

    if (isset($_POST['userName'])) {
        if ($_POST['userName'] != '') {

            $userName = $_POST["userName"];
            $class = "output-field";
            $message = "Hello, <span>$userName</span>, welcome to the internet!";


            if ($greetings[strtolower($userName)]) {

                $message = $greetings[strtolower($userName)];

            } 
        }
    }


}
?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Saying Hello</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input id="nme" type="text" class="text-number-input" required required name="userName" placeholder="What is your name?">
                    <label for="nme">What is your name?</label>
                </div>


                <button type="submit" name="submitted">
                    Who?
                </button>


                <div class="<?=$class?>">
                    <p>
                        <?=$message?>
                    </p>
                </div>
                
            </form>
        </div>
    </main>


</body>
</html>



