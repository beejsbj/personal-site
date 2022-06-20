<!doctype html>

<html lang='en' class='special-magic no-js'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>

		<title>Layout Theme Challenge</title>
		<meta name='description' content='Applying themes to given html'>
		<meta property='og:image' content=''>

		<link rel='stylesheet' href='styles/site.css'>
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet">
	</head>


	<body>
		<header>
		<inner-column>
			
			<?php include('modules/mast-head/template.php'); ?>

		</inner-column>	
		</header>

		<main>

			<section class='welcome' id='welcome'>
			<inner-column>

				<?php include('modules/graphic-diptych/template.php'); ?>

			</inner-column>
			</section>


			<section class='sign-up' id='sign-up'>
			<inner-column>

				<?php include('modules/call-to-action/template.php'); ?>

			</inner-column>
			</section>


			<section class='latest' id='latest'>
			<inner-column>

				<?php include('modules/articles-intro/template.php'); ?>

			</inner-column>
			</section>


			<section class='get-involved' id='get-involved'>
			<inner-column>

				<?php include('modules/call-to-action/template.php'); ?>

			</inner-column>
			</section>

		</main>

		<footer>
		<inner-column>
			
			<?php include('modules/site-map/template.php'); ?>

		</inner-column>
		</footer>
	</body>

</html>