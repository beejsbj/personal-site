<?php
	$project = getProject($_GET['project']);
	$sectionsArr = $pageData['sections'] ?? [1];
?>



<article>
<?php
	foreach ($sectionsArr as $section) {
		$module = $section['module'] ?? "generic-text";
?>
		<section class="article-section <?=$module?>">
			<inner-column>
				<?php include("templates/modules/$module/$module.php"); ?>
			</inner-column>
		</section>
<?php } ?>
</article>