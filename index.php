<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$currentTheme = currentTheme();
	$pageData = getPageData($currentPage);

	// Exercise detail page title metadata
	if (isset($_GET['exercise'])) {
		$pageData['title'] = "Exercises for Programmers";
		$pageData['page-title'] = $pageData['title'];
	}
?>

<!doctype html>
<html lang='en' class='special-magic no-js <?=$pageData['id']?> <?=$currentTheme?>-theme'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title><?=$pageData['title']?></title>
		<meta name="description" content="<?=$pageData['metaDesc']?>">
		<meta property="og:image" content="<?=$pageData['metaImage']?>">
		<link rel='stylesheet' href='styles/site.css'>
	</head>
	<body>
		<?php include('templates/modules/header/header.php'); ?>

		<main class="page-content">
		<?php renderPage($pageData); ?> <!-- dynamic page rending -->
		</main>

		<?php include('templates/modules/footer/footer.php'); ?>
	</body>
</html>

<?php//format(queryString())?>
<?php //format($pageData);?>