
<!doctype html>
<?php

function showErrors() {
  error_reporting(E_ALL);
  ini_set('display_errors', '1');
}
showErrors();


if (isset($_GET["page"])) {
	$page = $_GET["page"];
	$pageName = $_GET["page"];
} else {
	$pageName = "Home";
	$page = "home";
}

if (isset($_GET["jollyroger"])) {
	$pageName = "Jolly Roger Day " . $_GET["jollyroger"];
	$page = $_GET["jollyroger"];
	
}




?>
<html lang='en' class='special-magic no-js'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>

		<title>PSSST (CSS)</title>
		<meta name='description' content='PSSST (CSS)'>
		<meta property='og:image' content='A CSS methodology so great, it needed a name.'>

		<link rel='stylesheet' href='styles/site.css'>

		<style>

		</style>
	</head>


	<body>
		
		<h1>Jolly Rogers</h1>

		<nav class="site-menu">
			<a href="?page=home">Home</a>
			<a href="?page=list">Jolly Roger List</a>
		</nav>


		<p><?=$pageName?></p>




		<?php 
		include('data/skull-data.php');
		if ($page == 'list') {

			include('modules/jolly-grid/index.php');


			
		} 

		if (isset($_GET["jollyroger"])) {

			include('modules/detail/index.php');

		}

		  ?>

		

	</body>

</html>