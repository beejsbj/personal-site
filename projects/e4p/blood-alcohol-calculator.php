<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title></title>



</head>




    
<?php
 











$class = "hide";
 // $class = "output-field";




if (
    isset($_POST['submitted']) &&
    (isset($_POST['input1']))  && 
    ($_POST['input1'] != '')   && 
    (isset($_POST['input2']))  && 
    ($_POST['input2'] != '')
) {


    $class = "output-field"; 
}
?>



<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1></h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input id="input1-ID" type="text" name="input1" placeholder="input1??" value="">
                    <label for="input1-ID"></label>
                </div>


                <button type="submit" name="submitted">

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

















































