<!-- 2 Counting the Number of Characters

	take input from user and store in $string
		if string is empty, print "please enter something"
	
	use for loop to go through string to store character count in $count

		trigger it each time user inputs something into field

	initiiliaze $message and store "$string has $count characters"

	print $message. -->


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Count. Count. Count.</title>

    <style>
    	h1 {
    		font-size: clamp(70px, 8vw, 150px);
    	}
    </style>

</head>




    
<?php
function showPageErrors() {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}



// showPageErrors();



$class = "hide";



$inputString = '';
$message = '';
$count = 0;


function charCounter($string) {
	$counter = 0;

	for ($i = 0; $i < strlen($string); $i++) {  //tara dog

		$char = $string[$i]; // 

		if ($char != ' ') { 
			$counter++;
		}
	}

	return $counter;
}


if (isset($_POST['submitted'])) {
	
	if (isset($_POST['inputString'])) {

		if ($_POST['inputString'] != ''){

			

			$inputString = $_POST['inputString'];

			$count = charCounter($inputString);

			$message = "<span>'$inputString'</span> has <span>$count</span> characters.";



			$class = "output-field";
		}




	}

}


    





?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Counting&nbspthe&nbspNumber of Characters</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input type="text" name="inputString" placeholder="What is the input string?" value="">
                    <label for="">What is the input string?</label>
                </div>


                <button type="submit" name="submitted">
                    Count
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



