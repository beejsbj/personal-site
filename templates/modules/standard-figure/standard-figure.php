<?php

$image = $section['image'] ??  'images/landscape.jpg';

$caption = $section['caption'] ?? "";
?>

<standard-figure>
	<figure>
		<picture>
			<img src="images/<?= $image ?>" alt="">
		</picture>
		<figcaption class="whisper-voice caption">
			<?= $caption ?>
		</figcaption>
	</figure>
</standard-figure>