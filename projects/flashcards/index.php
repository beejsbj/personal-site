<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$pageData = getPageData($currentPage);
?>


<?php include('templates/modules/header/header.php'); ?>
<main class="page-content">
	
	<?php renderPage($pageData); ?>

</main>

<?php include('templates/modules/footer/footer.php'); ?>


<?=format(queryString())?>
<?php format($pageData);?>