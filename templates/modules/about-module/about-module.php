<?php
// if heading exists condition
$sectionHeading = $section['heading'] ?? "This is the About module";
$headingClass = "hide"
?>
<about-module>
	<h2 class="loud-voice">
		A Blurb About me
	</h2>
	<?php include('templates/modules/generic-text/generic-text.php') ?>
	<picture>
		<img src="images/burooj4.jpg" alt="">
	</picture>
</about-module>