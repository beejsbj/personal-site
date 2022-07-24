<?php


	function looper($start, $end, $step, $thing) {
		for ($i=$start; $i < $end ; $i=$i+$step) { 

			$thing;
			
		}
	}


function currentPage(){
	if (isset($_GET['page'])) {
	 	return $_GET['page'];
	 } else {
	 	return 'home';
	 }
}

//get page


// function renderPageData(){
// 	$page = currentPage();
  	

//   	if (!file_exists("data/$page.json")) {
//   		$json = file_get_contents("data/pageNotFound.json");
//   		//why isnt this working????? todo
//   	} else {
//   		$json = file_get_contents("data/$page.json");
//   	}
//   	$data = json_decode($json, true);
//   	return $data;
// }




function renderPage () {

	$page = currentPage();
	// include("templates/pages/standard.php");


	if (file_exists("modules/$page/$page.php")) {
		include("modules/$page/$page.php");
			

	}
	else {
		include("modules/pageNotFound.php");
	}
}


