<?php
////////////utilities////////////// 
// show error verbosely.
function showErrors() {
  error_reporting(E_ALL);
	ini_set('display_errors', '1');
}
showErrors();


// to print formatted arrays that are legible.
  function format($variable) {
    echo "<pre>";

      echo "<code>";

      	print_r( $variable );

      echo "</code>";
    echo "</pre>";
  }


  //show query string
function queryString()
{
	return $_SERVER['QUERY_STRING'];


}



////////////routing////////////// 

function currentPage(){
	if (isset($_GET['page'])) {
	 	return $_GET['page'];
	 } else {
	 	return 'home';
	 }
}

//get page


function getPageData($page){ 

  	if (!file_exists("data/pages/$page.json")) {
  		$json = file_get_contents("data/pages/pageNotFound.json");

  	} else {
  		$json = file_get_contents("data/pages/$page.json");
  	}
  	$data = json_decode($json, true);
  	return $data;
}




function renderPage ($data) {
	$pageData = $data;
	$page = currentPage();
	include("templates/pages/standard.php");


	if (file_exists("templates/pages/$page/$page.php")) {
		// include("templates/pages/$page/$page.php");
			

	}
	else {
		// include("templates/pages/pageNotFound.php");
	}
}




function dasher($string){
	//lowercase the string
	//split string at space 
	$splitString = explode(" ", $string);

	//add dashes 
	$finalString = implode("-", $splitString);

	return strtolower($finalString);
}




function activePage($current){

  if ($_GET["page"] == $current) {
    echo "active";
  } 
}





