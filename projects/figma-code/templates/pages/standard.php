
<?php
	
	$sectionsArr = $pageData['sections'];

	foreach ($sectionsArr as $section) {
		$module = $section['module'];
		$components = $section['components'];


		
?>
<section class="page-section">
	<inner-column>
		<?php include("templates/modules/$module/$module.php"); ?>
	</inner-column>
</section>
<?php } ?>