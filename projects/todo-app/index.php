<?php
include "functions.php";
$currentPage = currentPage();
$pageData = getPageData($currentPage);
?>
<!doctype html>
<html lang='en' class='special-magic no-js <?= $pageData[" id"] ?>'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title>
			<?= $pageData["title"] ?>
		</title>
		<meta name="description" content="<?= $pageData["title"] ?>">
		<meta property="og:image" content="<?= $pageData["title"] ?>">
		<link rel='stylesheet' href='styles/site.css'>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bevacqua/dragula@3.7.3/dist/dragula.min.css">
	</head>

	<body>
		<main class="page-content">
			<?php include "templates/modules/header/header.php"; ?>
			<inner-column class="wide" >
			<form>
				<input-field class='list'>
				<label class="loud-voice" for="in-app">Add a list</label>
				<input class="loud-voice" autofocus="autofocus" type="text" id="in-app">
				<button class="add-list">Add List</button>
			</input-field>
			</form>
			<todo-app>
			</todo-app>
			</inner-column>
		</main>
	</body>
	<script src='https://cdn.jsdelivr.net/gh/bevacqua/dragula@3.7.3/dist/dragula.min.js'></script>
	<script src="scripts/script.js" type="module"></script>
	<script type="module" src="https://unpkg.com/rough-notation?module"></script>

</html>
