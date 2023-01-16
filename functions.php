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

function getDirname() {
	return dirname($_SERVER['SCRIPT_NAME']);
}


  //show query string
function queryString(){
	return $_SERVER['QUERY_STRING'];
}
// format($_SERVER);
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




function renderPage ($data, $template = '') {
	$pageData = $data;
	$page = currentPage();
	if ($template) {
			include("templates/pages/$template/$template.php");
	} else {
		include("templates/pages/standard.php");
	}
}

function getProjects(){
	$json = file_get_contents("data/projects-list.json");
	$data = json_decode($json, true);
	return $data;
}

function getProject($id){
	$projects = getProjects();
	foreach ($projects as $project) {
		if ($project['id'] == $id) {
			return $project;
		}
	}
}



function activePage($current){
	
  if (currentPage() == $current) {
    return "active";
  } 
}
function activeTheme($current){
	
  if (currentPage() == $current) {
    return "active";
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


function exExists($slug){
	return	file_exists("projects/e4p/exercises/$slug.php");
}




// $siteSlug = explode('/', $_SERVER['QUERY_STRING']);





// format($_SERVER);