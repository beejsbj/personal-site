<?php

// format($pageData);



?>

<project-meta>
	<meta-card>
		<h3 class="teaser-voice">
			what?
		</h3>
		<p class="notice-voice">
			<?= $pageData['role'] ?>
		</p>

	</meta-card>
	<meta-card>
		<h3 class="teaser-voice">
			where?
		</h3>
		<p class="notice-voice">
			<?= $pageData['location'] ?>
		</p>

	</meta-card>
	<meta-card>
		<h3 class="teaser-voice">
			when?
		</h3>
		<p class="notice-voice">
			<?= substr($pageData['date'], 0, 4) ?>
		</p>

	</meta-card>
</project-meta>

<style>
	@media (min-width: 750px) {
		section.project-meta {
			grid-column: 2 / 10;
			z-index: 999;
		}



	}

	project-meta {
		display: grid;
		grid-gap: 1rem;



	}

	@media (min-width: 768px) {
		project-meta {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	project-meta meta-card {
		display: grid;
		gap: 0.5rem;
	}

	project-meta h3 {
		padding-bottom: 3px;
		border-bottom: 1px solid var(--color-tertiary);


	}

	project-meta p {
		white-space: nowrap;
	}
</style>