


    
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



<form id="e4p" method="POST">

    <div class="input-field">
        <input id="quote" type="text" class="text-number-input" required name="quote" placeholder="What is the Quote?" value="<?=$quote?>">
        <label for="quote">What is the Quote?</label>
    </div>
    <div class="input-field">
        <input id="author" type="text" class="text-number-input" required name="author" placeholder="Who said it?" value="<?=$author?>">
        <label for="author">Who said it?</label>
    </div>


    <button type="submit" name="submitted">
        Print
    </button>


    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
    
</form>
