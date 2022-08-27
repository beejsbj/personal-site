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
		$module = $section['module'] ?? "generic-text";

		
		?>
		<section class="page-section">
			<inner-column>
				<?php include("templates/modules/$module/$module.php"); ?>
			</inner-column>
		</section>
	<?php } ?>