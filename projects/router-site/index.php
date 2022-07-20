<?php include('functions.php'); ?>
<?=format(queryString())?>
<?php include('templates/modules/header/header.php'); ?>
<?php format($pageData);?>


<main class="page-content dynamic-section">

<!-- dynamic page rending -->
	<?php renderPage($pageData); ?>


</main>
<?php include('templates/modules/footer/footer.php'); ?>