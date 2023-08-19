<?php

$image = $section['image'] ??  'images/landscape.jpg';

$caption = $section['caption'] ?? "";
?>

<standard-figure>
	<figure>
		<picture>
			<img src="images/<?= $image ?>" alt="">
		</picture>
		<figcaption>
			<?= $caption ?>
		</figcaption>
	</figure>
	<p>description of figure and why it matter</p>
</standard-figure>