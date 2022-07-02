<!doctype html>
<?php
include('functions.php');
session_start();


// echo $_SESSION['name'];



if (isset($_GET["page"])) {
	$page = $_GET["page"];
	$pageName = $_GET["page"];

} else {
	$pageName = "Home";
	$page = "home";
	$_GET["page"] = 'home';
}





?>
<html lang='en' class='special-magic no-js'>
	<?php include('head.php') ?>

	<body>
		<?php include('modules/header/index.php') ?>
		<main class="page-content">
			<inner-column>
				<?php 	getTemplate($page);	  ?>
			</inner-column>
		</main>
		<div class="ocean">
			
			<div class="wave"><?php include('images/ship.php') ?></div>
			<div class="wave"></div>

		</div>
	</body>

</html>