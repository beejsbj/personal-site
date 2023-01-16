<?php
	$sectionsArr = $pageData['sections'] ?? [1];
?>



<article>
<?php
	foreach ($sectionsArr as $section) {
		$module = $section['module'] ?? "generic-text";
		$class = $section['section-class'] ?? "";
?>
		<section class="article-section <?=$module?> <?=$class?>">
			<inner-column>
				<?php include("templates/modules/$module/$module.php"); ?>
			</inner-column>
		</section>
<?php } ?>
</article>