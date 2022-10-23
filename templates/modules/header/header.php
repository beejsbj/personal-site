 

<!doctype html>
<html lang='en' class='special-magic no-js <?=$pageData['id']?>'>

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

			<svg class="circle" viewBox="0 0 100 100">
			  <circle cx="50" cy="50" r="40" />
			</svg> 

			<inner-column class="menus">
				<?php include('templates/components/site-menu/site-menu.php'); ?>
			</inner-column>
			<inner-column class="menus">
				<?php include('templates/components/theme-menu/theme-menu.php'); ?>
			</inner-column>

			<inner-column>
				<h1 class="booming-voice">
					<?=$pageData['page-title']?>
				</h1>
			</inner-column>
		</header>