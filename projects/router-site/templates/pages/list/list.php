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
		


		
			
		

?>
<section class="page-section">
	<inner-column>
		<h2 class="attention-voice">
			<?=$heading?>
		</h2>
		<?php
			if ($id == "things-grid") {
				include('templates/modules/things-grid/things-grid.php');
			}
 		 ?>
	</inner-column>
</section>
<?php } ?>