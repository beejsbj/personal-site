
<!doctype html>
<?php




if (isset($_GET["page"])) {
	$page = $_GET["page"];
	
} else {
	$page = "empty";
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
	</head>


	<body>
		
		<h1>Jolly Rogers</h1>

		<nav class="site-menu">
			<a href="?page=home">Home</a>
			<a href="?page=list">Monsters</a>
		</nav>


		<p><?=$page?> page</p>

		

	</body>

</html>