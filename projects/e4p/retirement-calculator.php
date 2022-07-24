
<!-- 6 Retirement Calculator
    
    get current year from system and store into $currentYear

    take input from user for their age and the desired retirement age
    print   "What is your current age?" 
            "At what age would you like to retire?"
            
                convert input to num and store into $currentAge and $retireAge

    calculate difference between retireAge and currentAge
        store into variable. $ageDifference

    add $age difference to $currentYear, store in variable. $retireYear -->



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Retire when?</title>



</head>




    
<?php
 






$class = "hide";
 // $class = "output-field";


$currentYear = date("Y");
$currentAge = 0;
$retireAge = 0;
$ageDifference = 0;
$retireYear = 0;





if (isset($_POST['submitted'])){
    
    if ((isset($_POST['currentAge'])) && (isset($_POST['retireAge']))) {
        


        if (($_POST['currentAge'] != '') && ($_POST['retireAge'] != '')) {

            $currentAge = floatval($_POST['currentAge']);
            $retireAge = floatval($_POST['retireAge']);
            $ageDifference = $retireAge - $currentAge;
            $retireYear = $currentYear + $ageDifference;




            $output = "You have <span>$ageDifference</span> years left until you can retire.<br>
                        It's <span>$currentYear</span>, so you can retire in <span>$retireYear</span>.";







            

            if ($ageDifference <= 0) {
                $output = "What're you doing?! you can retire already. <br> go! go!";
            }



            $class = "output-field";

        }

    }



           
           


}





    





?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Retirement Calculator</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input type="text" class="text-number-input" required name="currentAge" placeholder="current age?" value="" min="0">
                    <label for="">What is your current age?</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="retireAge" placeholder="age to retire?" value="" min="0">
                    <label for="">At what age would you like to retire?</label>
                </div>



                <button type="submit" name="submitted">
                    Submit
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







































