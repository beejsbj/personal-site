<?php

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
function queryString(){
	return $_SERVER['QUERY_STRING'];
}


function currentPage(){
	if (isset($_GET['page'])) {
	 	return $_GET['page'];
	 } else {
	 	return 'home';
	 }
}

//get page
function renderPage ($data) {
	$pageData = $data;
	$page = currentPage();

	if (file_get_contents("templates/pages/$page/$page.php")) {
		include("templates/pages/$page/$page.php");			
	}
	else {
		include("templates/pages/pageNotFound.php");
	}

	
}



function renderPageData(){
	$page = currentPage();
  	$json = file_get_contents("data/$page.json");
  	return json_decode($json, true);
}


















