<?php include('functions.php'); ?>

<!doctype html>

<html lang='en' class='special-magic no-js'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>

		<title>Garden</title>
		<meta name='description' content='Garden'>
		<meta property='og:image' content='https://www.ugaoo.com/knowledge-center/wp-content/uploads/2016/03/shutterstock_193618733-850x525.jpg'>

		<link rel='stylesheet' href='styles/site.css'>
	</head>


	<body>
		<header>
			<inner-column>
				<h1 class='title-voice'>Layout Garden</h1>
				<site-menu>
				<nav>
					<a href="?page=home">Home</a>
					<a href="?page=layout1">Layout 1</a>
					<a href="?page=layout2">Layout 2</a>
					<a href="?page=layout3">Layout 3</a>
					<a href="?page=layout4">Layout 4</a>
				</nav>
			</site-menu>
			</inner-column>
		</header>

		<main class="page-content">

			<?php renderPage (); ?>
		</main>

		<footer>
			<inner-column>
				<h2 class="loud-voice">Zee footah</h2>
			</inner-column>
		</footer>
	</body>

</html>