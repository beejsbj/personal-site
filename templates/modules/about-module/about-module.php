<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the About module";
?>
<about-module>
	<text-content>
		<h2 class="attention-voice">
			<?=$sectionHeading?>
		</h2>
		<?php
	$paragraphs = $section['paragraphs'] ?? ["this is about paragraph"]; 
	foreach ($paragraphs as $paragraph) { ?>
		<p class="calm-voice">
			<?=$paragraph?>
		</p>
	
	<?php } ?>
	</text-content>
	<image-grid>
		<?php
		$images = $section['images']  ?? ['square.jpg', 'square.jpg']; 
		foreach ($images as $image) { ?>
		<picture>
			<img src="images/<?=$image?>" alt="">
		</picture>
		<?php } ?>
	</image-grid>
</about-module>