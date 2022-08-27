<about-module>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
	<?php
	$paragraphs = $section['paragraphs']; 
	foreach ($paragraphs as $paragraph) { ?>
		<p class="calm-voice">
			<?=$paragraph?>
		</p>
	<?php } ?>

	<image-grid>
		<?php
		$images = $section['images']; 
		foreach ($images as $image) { ?>
			<picture>
				<img src="images/<?=$image?>" alt="">
			</picture>
		<?php } ?>
	</image-grid>


</about-module>