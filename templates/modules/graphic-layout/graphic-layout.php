<?php

$image = "images/projects/" . $section['image'] ?? "images/" . $pageData['image'] ?? 'images/landscape.jpg';
$device = $section['device'] ?? "desktop";
$caption = $section['caption'] ?? "";

?>


<graphic-layout>
	<div>
		<picture>
			<img src="<?= $image ?>">
		</picture>
	</div>
	<p class="whisper-voice caption">
		<?= $caption ?>
	</p>
</graphic-layout>


<style>
	@media (min-width: 750px) {
		section.graphic-layout {
			grid-column: 2 / 10;
			z-index: 999;
		}

	}


	graphic-layout .one-image {
		grid-template-columns: 1fr;
	}

	graphic-layout div {
		display: grid;
		gap: 0.5rem;

	}



	graphic-layout div picture:nth-of-type(1) {
		aspect-ratio: 16 / 9;
	}

	graphic-layout div picture:nth-of-type(2) {
		aspect-ratio: 9 / 16;
	}

	graphic-layout div picture img {
		object-fit: cover;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	graphic-layout .caption {
		text-align: right;
	}
</style>