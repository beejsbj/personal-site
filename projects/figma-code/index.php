<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$pageData = getPageData($currentPage);
?>



<?php include('templates/modules/header/header.php'); ?>

<main class="page-content">
<!-- dynamic page rending -->
	<?php renderPage($pageData); ?>
</main>

<?php include('templates/modules/footer/footer.php'); ?>


<?php//format(queryString())?>
<?php //format($pageData);?>