

    
<?php
 







$class = "hide";
$output = '';

$noun = '';
$verb = '';
$adjective = '';
$adverb = '';



if (isset($_POST['submitted'])) {


    if ((isset($_POST['noun'])) && 
        (isset($_POST['verb'])) &&
        (isset($_POST['adjective'])) &&
        (isset($_POST['adverb']))
    ) {

    if (($_POST['noun'] != '') && 
        ($_POST['verb'] != '') &&
        ($_POST['adjective'] != '') &&
        ($_POST['adverb'] != '')
    ) {


            $noun = $_POST['noun'];
            $verb = $_POST['verb'];
            $adjective = $_POST['adjective'];
            $adverb = $_POST['adverb'];

            $output = "Do you <span>$verb</span> your <span>$adjective</span> <span>$noun</span> <span>$adverb</span>? That's hilarious!";







            $class = "output-field";
        }
    }
}





    





?>


            <form method="POST">

                <div class="input-field">
                    <input type="text" class="text-number-input" required name="noun" placeholder="noun" value="<?=$noun?>">
                    <label for="">Enter a noun</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="verb" placeholder="verb" value="<?=$verb?>">
                    <label for="">Enter a verb</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="adjective" placeholder="adjective" value="<?=$adjective?>">
                    <label for="">Enter an adjective</label>
                </div>
                <div class="input-field">
                    <input type="text" class="text-number-input" required name="adverb" placeholder="adverb" value="<?=$adverb?>">
                    <label for="">Enter an adverb</label>
                </div>


                <button type="submit" name="submitted">
                    Lib
                </button>


                <div class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
                
            </form>
        