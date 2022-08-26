<?php include('functions.php'); ?>
<?php $pageData = renderPageData();?>


<?php include('templates/modules/header/header.php'); ?>
<main class="page-content">

<!-- dynamic page rending -->
	<?php renderPage($pageData); ?>

</main>
<?php include('templates/modules/footer/footer.php'); ?>


<?=format(queryString())?>
<?php format($pageData);?>