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
<html lang='en' class='special-magic no-js'>

<head>
	<meta charset='utf-8'>
	<meta name='viewport' content='width=device-width, initial-scale=1'>
	<title><?= $pageData['title'] ?></title>
	<meta name="description" content="<?= $pageData['description'] ?>">
	<meta property="og:image" content="<?= $pageData['image'] ?>">
	<link rel='stylesheet' href='styles/<?= $currentTheme ?>/site.css'>

	<link rel="icon" href="images/circle.svg" />

	<script defer type="module" src="scripts/<?= $currentTheme ?>/index.js"></script>
</head>

<body class="<?= "$currentPage-page" ?> <?= "$currentTheme-theme" ?>">
	<?php include('templates/modules/header/header.php'); ?>

	<main class="page-content transition-reveal" id="swup">
		<section class="page-title">
			<inner-column>
				<h1 class="booming-voice">
					<?= $pageData['heading'] ?? 'NA' ?>
				</h1>
			</inner-column>
		</section>

		<?php renderPage($pageData, $template); ?> <!-- dynamic page rending -->

	</main>

	<?php include('templates/modules/footer/footer.php'); ?>

	<div class="page-loader">
		<h1 class="booming-voice">

		</h1>
	</div>



	<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>

	<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/MotionPathPlugin.min.js"></script>
	<!-- <script src="https://unpkg.com/@barba/core"></script> -->


</body>

</html>

<?php //format(queryString())
?>
<?php //format($pageData);
?>

<!-- test -->