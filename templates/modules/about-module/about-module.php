<?php
// if heading exists condition
$sectionHeading = $section['heading'] ?? "This is the About module";
$headingClass = "hide"
?>
<about-module>
	<?php include('templates/modules/generic-text/generic-text.php') ?>
	<?php include('templates/components/fan-images/fan-images.php') ?>
</about-module>