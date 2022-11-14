<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the About module";
?>
<about-module>
	<?php include('templates/modules/generic-text/generic-text.php') ?>
	<?php include('templates/modules/image-grid/image-grid.php') ?>
</about-module>