<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$pageData = getPageData($currentPage);
?>
<!doctype html>
<html lang='en' class='special-magic no-js <?=$pageData[' id']?>'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title>
			<?=$pageData['title']?>
		</title>
		<meta name="description" content="<?=$pageData['title']?>">
		<meta property="og:image" content="<?=$pageData['title']?>">
		<link rel='stylesheet' href='styles/site.css'>
	</head>

	<body>
		<main class="page-content">
			<h1 class="loud-voice">Todo App</h1>
			<input-field>
				<label class="attention-voice" for="in-app">Add a list</label>
				<input type="text" id="in-app">
				<button class="add-list">Add List</button>
			</input-field>
			<todo-app>
			</todo-app>
		</main>
	</body>
	<script src="scripts/script.js" type="module"></script>

</html>