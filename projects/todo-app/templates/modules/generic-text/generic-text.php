<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the Generic text module";
	$paragraph = $section['intro'] ?? "this is the generic text paragraph";
?>

<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>

<p class="calm-voice">
	<?=$paragraph?>
</p>