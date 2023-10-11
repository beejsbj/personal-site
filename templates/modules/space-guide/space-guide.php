<?php
//   --space-3xs: clamp(0.25rem, 0.25rem + 0vw, 0.25rem);
//   --space-2xs: clamp(0.5rem, 0.5rem + 0vw, 0.5rem);
//   --space-xs: clamp(0.75rem, 0.75rem + 0vw, 0.75rem);
//   --space-s: clamp(1rem, 1rem + 0vw, 1rem);
//   --space-m: clamp(1.5rem, 1.5rem + 0vw, 1.5rem);
//   --space-l: clamp(2rem, 2rem + 0vw, 2rem);
//   --space-xl: clamp(3rem, 3rem + 0vw, 3rem);
//   --space-2xl: clamp(4rem, 4rem + 0vw, 4rem);
//   --space-3xl: clamp(6rem, 6rem + 0vw, 6rem);


$spaces = [
	'3xs' => '0.25rem',
	'2xs' => '0.5rem',
	'xs' => '0.75rem',
	's' => '1rem',
	'm' => '1.5rem',
	'l' => '2rem',
	'xl' => '3rem',
	'2xl' => '4rem',
	'3xl' => '6rem',
];

?>


<space-guide>
	<text-content>
		<h2 class="attention-voice">
			Spaces
		</h2>
		<p>
			These are the spaces used in the app. They are defined in
			<code>settings.css</code> and are available as CSS variables which are
			used throughout the app.
		</p>

	</text-content>

	<ul class="spaces">

		<?php foreach ($spaces as $name => $value) { ?>
			<li class="space" style="
				--space-width: <?= $value ?>;
				">
				<code class="space-name">
					--space-<?= $name ?> : <?= $value ?>
				</code>

				<div></div>
			</li>
		<?php } ?>
	</ul>


</space-guide>


<style>
	space-guide {
		display: grid;
		grid-gap: var(--space-s);
	}

	space-guide .spaces {
		display: grid;
		/* grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); */
		grid-gap: var(--space-xl);
	}

	space-guide .space {
		display: grid;

	}

	space-guide .space div {
		width: var(--space-width);
		aspect-ratio: 1 / 1;
		background: var(--color);
	}

	space-guide code {
		font-size: var(--step--1);
	}
</style>