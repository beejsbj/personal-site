<?php
$class = $section['section-class'] ?? "layout-1";
$image1 = "images/projects/" . $section['image1'] ?? "images/" . $pageData['image'] ?? 'images/landscape.jpg';
$image2 = isset($section['image2']) ? "images/projects/" . $section['image2'] : NULL;
$caption = $section['caption'] ?? "";

?>


<graphic-layout class="<?= $class ?>">
	<div class="<?= $image2 == NULL ? 'one-image' : 'two-images' ?>">
		<picture>
			<img src="<?= $image1 ?>">
		</picture>
		<picture class="<?= $image2 == NULL ? 'hide' : '' ?>">
			<img src="<?= $image2 ?>">
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

	graphic-layout .two-images {
		grid-template-columns: 1fr 0.5fr;
	}

	graphic-layout .one-image {
		grid-template-columns: 1fr;
	}

	graphic-layout.layout-1 div {
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