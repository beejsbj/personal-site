<?php

$class = "hide";

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
<form id="e4p" autocomplete='off' method="POST">
    <div class="input-field">
        <input id="input1-ID" type="text" class="text-number-input" class="text-number-input" required name="input1" placeholder="input1??" value="<?=$input1?>">
        <label for="input1-ID"></label>
    </div>
    <button type="submit" name="submitted">
    </button>
    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
</form>