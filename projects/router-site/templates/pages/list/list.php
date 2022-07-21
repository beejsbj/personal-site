<section class="page-section">
	<inner-column>
		<h1 class="loud-voice">
		<?=$pageData['intro']?>
	</h1>
	</inner-column>
</section>
<?php
	
	$sectionsArr = $pageData['sections'];

	foreach ($sectionsArr as $section) {
		$heading = $section['heading'];
		$id = $section['id'];
		$items = $section['items'];

		
			
		

?>
<section class="page-section">
	<inner-column>
		<h2 class="attention-voice">
			<?=$heading?>
		</h2>
		<?php include('templates/modules/things-grid/things-grid.php'); ?>
	</inner-column>
</section>
<?php } ?>