<?php 
	include('functions.php'); 

	$currentPage = currentPage();
	$currentTheme = currentTheme();
	$pageData = getPageData($currentPage);
	$template = $pageData['template'] ?? '';

	// Exercise detail page title metadata
	if (isset($_GET['exercise'])) {
		$pageData['title'] = "Exercises for Programmers";
		$pageData['heading'] = $pageData['title'];
	}
	if (isset($_GET['project'])) {
		$pageData = getProject($_GET['project']);
	}
?>

<!doctype html>
<html lang='en' class='special-magic no-js <?=$pageData['id']?> >

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title><?=$pageData['title']?></title>
		<meta name="description" content="<?=$pageData['description']?>">
		<meta property="og:image" content="<?=$pageData['image']?>">
		<link rel='stylesheet' href='<?=$slugLength?>styles/<?=$currentTheme?>/site.css'>
	</head>
	<body>
		<?php include('templates/modules/header/header.php'); ?>

		<main class="page-content">
		<?php renderPage($pageData, $template); ?> <!-- dynamic page rending -->
		</main>

		<?php include('templates/modules/footer/footer.php'); ?>
	</body>
</html>

<?php//format(queryString())?>
<?php //format($pageData);?>