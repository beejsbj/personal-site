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
function showPageErrors() {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}



// showPageErrors();







$class = "hide";
 // $class = "output-field";




if (isset($_POST['submitted'])){
    


           
           


}





    





?>

<body>
    <header>
        <div class="inner-column">
            <h1></h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input type="text" name="" placeholder="" value="">
                    <label for=""></label>
                </div>


                <button type="submit" name="submitted">

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



