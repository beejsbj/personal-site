<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$pageData = getPageData($currentPage);
?>



<?php
// Exercise detail page title metadata
if (isset($_GET['exercise'])) {
	$pageData['title'] = "Exercises for Programmers";
	$pageData['page-title'] = $pageData['title'];
}
?>


<?php include('templates/modules/header/header.php'); ?>
<main class="page-content">

<!-- dynamic page rending -->
	<?php renderPage($pageData); ?>

</main>
<?php include('templates/modules/footer/footer.php'); ?>


<?php//format(queryString())?>
<?php //format($pageData);?>