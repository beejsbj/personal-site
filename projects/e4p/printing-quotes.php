
<?php include('functions.php'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Quote Printer</title>



</head>




    
<?php
 







$class = "hide";

$quote = '';
$author = '';
$output = '';


if (isset($_POST['submitted'])) {
    // code...

    if ((isset($_POST['quote'])) && (isset($_POST['author']))) {
        // code...
    if (($_POST['quote'] != '') && ($_POST['author'] != '')) {
            // code...

            $quote = $_POST['quote'];
            $author = $_POST['author'];

            $output = "<span>" . "$author" . "</span> says, <em>'" . "$quote" . "'</em>";







            $class = "output-field";
        }
    }
}





    





?>

<body>
    <header>

        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Printing Quotes</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input type="text" class="text-number-input" required name="quote" placeholder="What is the Quote?" value="<?=$quote?>">
                    <label for="">What is the Quote?</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="author" placeholder="Who said it?" value="<?=$author?>">
                    <label for="">Who said it?</label>
                </div>


                <button type="submit" name="submitted">
                    Print
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

