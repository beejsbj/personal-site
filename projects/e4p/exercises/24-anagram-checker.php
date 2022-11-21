<?php

$class = "hide";

$string1 = "";
$string2 = "";

function isAnagram($str1, $str2) {
    $str1 = str_split($str1);
    sort($str1);
    $str1 = implode($str1);
    $str2 = str_split($str2);
    sort($str2);
    $str2 = implode($str2);

    return $str1 == $str2; 
}

if ( isset($_POST['submitted']) ) {

    $string1 = strtolower($_POST['string1']);
    $string2 = strtolower($_POST['string2']);
    $output = "<span>$string1</span> and <span>$string2</span> are NOT anagrams";

    if (isAnagram( $string1, $string2 )) {
        $output = "<span>$string1</span> and <span>$string2</span> are anagrams"; 
    }

    $class = "output-field"; 
}
?>
<form id="e4p" autocomplete='off' method="POST">
    <div class="input-field">
        <input id="string1-ID" type="text" class="text-number-input" class="text-number-input" required name="string1" placeholder="string1??" value="<?=$string1?>">
        <label for="string1-ID">Enter the first string</label>
    </div>
    <div class="input-field">
        <input id="string2-ID" type="text" class="text-number-input" class="text-number-input" required name="string2" placeholder="string2??" value="<?=$string2?>">
        <label for="string2-ID">Enter the second string</label>
    </div>
    <button type="submit" name="submitted">
        Check
    </button>
    <output class="<?=$class?>" >
	 <p><?=$output?></p>
    </output>
</form>

