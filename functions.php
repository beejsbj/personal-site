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

//get page name
function currentPage(){ 
	if (isset($_GET['page'])) {
	 	return $_GET['page'];
	 } else {
	 	return 'home';
	 }
}


//get page data
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


	// if (file_exists("templates/pages/$page/$page.php")) {
	// 	// include("templates/pages/$page/$page.php");
			

	// }
	// else {
	// 	// include("templates/pages/pageNotFound.php");
	// }
}






function dasher($string){
	//lowercase the string
	//split string at space 
	$splitString = explode(" ", $string);

	//add dashes 
	$finalString = implode("-", $splitString);

	return strtolower($finalString);
}

function unDasher($string){
	$splitString = explode("-", $string);

	$finalString = implode(" ", $splitString);

	return ucwords($finalString);
}





function activePage($current){
	
  if (currentPage() == $current) {
    echo "active";
  } 
}



function currentTheme(){ 
	if (isset($_GET['theme'])) {
	 	return $_GET['theme'];
	 } else {
	 	return 'default';
	 }
}

function projectFilter($projects, $tag) {
	$filtered = [];

	foreach ($projects as $project) {
		$tags = $project['tags'] ?? [];

		if ( in_array($tag, $tags) ) {
			array_push($filtered, $project);
		}
	}
	return $filtered;
}