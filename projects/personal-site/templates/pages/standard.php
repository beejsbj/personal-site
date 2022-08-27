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
		$module = $section['module'];

		// if heading exists condition
		$sectionHeading = $section['heading'] ?? "This is the section Heading";
		?>
		<section class="page-section">
			<inner-column>
				<?php include("templates/modules/$module/$module.php"); ?>
			</inner-column>
		</section>
	<?php } ?>