<?php



  function format($variable) {
    echo "<pre>";

      echo "<code>";

        print_r( $variable );

      echo "</code>";
    echo "</pre>";
  }

	function showPageErrors() {
    	ini_set('display_errors', 1);
    	ini_set('display_startup_errors', 1);
    	error_reporting(E_ALL);
	}
	// showPageErrors();



function getKebabCase($string){
    $str = str_replace(" ", "-", strtolower($string));
    return $str; // php-replace-space-with-dash
}



function getCamelCase($string){
    $splitString = explode(" ", ucwords($string));
    $finalString = implode("", $splitString);
    $finalString[0] = strtolower($finalString[0]);
    return $finalString;
}

function getTitleCase($title) {
    // Our array of 'small words' which shouldn't be capitalised if
    // they aren't the first word. Add your own words to taste.
    $smallwordsarray = [
        'of','a','the','and','an','or','nor','but','is','if','then','else','when',
        'at','from','by','on','off','for','in','out','over','to','into','with'
    ];

    // Split the string into separate words
    $words = explode('-', strtolower($title));

    foreach ($words as $key => $word) {

    // If this word is the first, or it's not one of our small words, 
        if ($key == 0 or !in_array($word, $smallwordsarray)) {
            $words[$key] = ucwords($word); //capitalise it with ucwords().
        }
    }

    // Join the words back into a string
    $newtitle = implode(' ', $words);

    return $newtitle;
}