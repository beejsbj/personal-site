<!doctype html>
<html lang='en' class='special-magic no-js'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title><?=$pageData['title']?></title>
		<meta name="description" content="<?=$pageData['metaDesc']?>">
		<meta property="og:image" content="<?=$pageData['metaImage']?>">
		<link rel='stylesheet' href='styles/site.css'>
	</head>

	<body>
		<header>
			<inner-column>
				<?php include('templates/modules/site-menu/site-menu.php'); ?>
			</inner-column>
		</header>