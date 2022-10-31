<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$pageData = getPageData($currentPage);
?>

<!doctype html>
<html lang='en' class='special-magic no-js <?=$pageData['id']?>'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title><?=$pageData['title']?></title>
		<meta name="description" content="<?=$pageData['title']?>">
		<meta property="og:image" content="<?=$pageData['title']?>">
		<link rel='stylesheet' href='styles/site.css'>
	</head>

	<body>
		<?php include('templates/modules/header/header.php'); ?>
		<main class="page-content">

			<!-- inner column outside moduke -->
			<section class='page-section' id='and-its-id'>
				<inner-column> 
					Section within inner-column in index page 
				</inner-column>
			</section>

			<!-- inner column inside module -->
			<?php include('templates/modules/section-test/section-test.php'); ?>
			
			<?php renderPage($pageData); ?>

		</main>
		<?php include('templates/modules/footer/footer.php'); ?>
	</body>

</html>

<?=format(queryString())?>
<?php format($pageData);?>