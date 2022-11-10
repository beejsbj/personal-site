<?php



	function showPageErrors() {
    	ini_set('display_errors', 1);
    	ini_set('display_startup_errors', 1);
    	error_reporting(E_ALL);
	}
	// showPageErrors();



	function isChecked($name, $value){
  		if ($name == $value){
    		return 'checked';
  		}
}

($name == $value) ? 'checked' : null; 

function dasher($string){
                    //lowercase the string
                    //split string at space 
                    $splitString = explode(" ", $string);

                    //add dashes 
                    $finalString = implode("-", $splitString);

                    return strtolower($finalString);
                }