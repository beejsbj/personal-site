<?php
session_start();

include('functions.php');
$_SESSION['theme'] = currentTheme();



$__dirname = dirname($_SERVER['SCRIPT_NAME']);
$currentPage = currentPage(); // ugly 
$currentTheme = $_SESSION['theme'];
$pageData = getPageData($currentPage);
$template = $pageData['template'] ?? '';




// Exercise detail page title metadata
if (isset($_GET['exercise']) && $_GET['exercise'] > 57) {
	$pageData = getPageData('notfound');
}
if (isset($_GET['project'])) {
	$pageData = getProject($_GET['project']) ?? getPageData('notfound');
}
?>

<!doctype html>
<html lang='en' class='special-magic no-js <?= $pageData['id'] ?> <?= "$currentTheme-theme" ?>'>

<head>
	<base href="<?= $__dirname ?>/">
	<meta charset='utf-8'>
	<meta name='viewport' content='width=device-width, initial-scale=1'>
	<title><?= $pageData['title'] ?></title>
	<meta name="description" content="<?= $pageData['description'] ?>">
	<meta property="og:image" content="<?= $pageData['image'] ?>">
	<link rel='stylesheet' href='styles/<?= $currentTheme ?>/site.css'>

	<link rel="icon" href="images/circle.svg" />

	<script defer type="module" src="scripts/<?= $currentTheme ?>/index.js"></script>
</head>

<body data-barba="wrapper">
	<?php include('templates/modules/header/header.php'); ?>

	<main class="page-content" data-barba="container" data-barba-namespace="<?= $pageData['heading'] ?>">
		<section class="page-title">
			<inner-column>
				<p class="booming-voice">
					<?= $pageData['heading'] ?? 'NA' ?>
				</p>
			</inner-column>
		</section>

		<?php renderPage($pageData, $template); ?> <!-- dynamic page rending -->

	</main>

	<?php include('templates/modules/footer/footer.php'); ?>

	<div class="page-loader">
		<h1 class="booming-voice">

		</h1>
	</div>



	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/gsap.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/ScrollTrigger.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.5/MotionPathPlugin.min.js"></script>
	<script src="https://unpkg.com/@barba/core"></script>


</body>

</html>

<?php //format(queryString())
?>
<?php //format($pageData);
?>

<!-- test -->