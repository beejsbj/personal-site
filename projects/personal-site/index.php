<?php include('functions.php'); ?>
<?php $pageData = getPageData();?>


// Exercise detail page title metadata
<?php
if (isset($_GET['exercise'])) {
	$pageData['title'] = unDasher($_GET['exercise']);
	$pageData['page-title'] = $pageData['title'];
}
?>


<?php include('templates/modules/header/header.php'); ?>
<main class="page-content">

<!-- dynamic page rending -->
	<?php renderPage($pageData); ?>

</main>
<?php include('templates/modules/footer/footer.php'); ?>


<?=format(queryString())?>
<?php format($pageData);?>