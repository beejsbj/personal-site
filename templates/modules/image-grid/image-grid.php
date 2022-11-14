<?php
	$images = $section['images'] ?? [1, 2, 3];
?>

<image-grid>
	<?php foreach ($images as $image) { ?>
	<picture 
		class="<?=($image['name'] ?? 'square')?>"
	>
		<img 
			src="images/<?=($image['slug'] ?? 'square.jpg')?>" 
			alt="<?=($image['caption'] ?? 'fallback square image')?>"
		>
	</picture>
	<?php } ?>
</image-grid>