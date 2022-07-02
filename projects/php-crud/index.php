<!doctype html>
<?php
include('functions.php');



session_start();

$_SESSION['name'] = 'password';

// echo $_SESSION['name'];



if (isset($_GET["page"])) {
	$page = $_GET["page"];
	$pageName = $_GET["page"];

} else {
	$pageName = "Home";
	$page = "home";
	$_GET["page"] = 'home';
}


if (isset($_GET["jollyroger"])) {
	$pageName = "Jolly Roger Day " . $_GET["jollyroger"];

	
}




?>
<html lang='en' class='special-magic no-js'>

<?php include('head.php') ?>

<body>

	<header>
		<?php include('modules/header/index.php') ?>
	</header>

	<main class="page-content">
		<inner-column>
			<?php 	getTemplate($page);	  ?>
		</inner-column>
	</main>

</body>

</html>