<?php 
	$headerJson = file_get_contents("data/modules/header.json");
	$headerData = json_decode($headerJson, true);

	$components = $headerData['components'];
	$siteMenu = $components['site-menu'];
	$buttons = $components['buttons'];
?>
<mast-head>
	<picture class="logo">
		<?php include('images/logo.php'); ?>
	</picture>
	<?php include('templates/components/site-menu/site-menu.php'); ?>
	<?php include('templates/components/buttons/buttons.php'); ?>
</mast-head>