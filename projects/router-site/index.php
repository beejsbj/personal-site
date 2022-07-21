<?php include('functions.php'); ?>
<?php $pageData = renderPageData();?>
<?=format(queryString())?>
<?php format($pageData);?>

<?php include('templates/modules/header/header.php'); ?>
<main class="page-content dynamic-section">

<!-- dynamic page rending -->
	<?php renderPage($pageData); ?>

</main>
<?php include('templates/modules/footer/footer.php'); ?>


