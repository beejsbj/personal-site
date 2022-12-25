
<?php
	$sectionsArr = $pageData['sections'] ?? [1];

	foreach ($sectionsArr as $section) {
		$module = $section['module'] ?? "generic-text";
?>
		<section class="page-section <?=$module?>">
			<inner-column>
				<?php include("templates/modules/$module/$module.php"); ?>
			</inner-column>
		</section>
	<?php } ?>