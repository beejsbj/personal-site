<?php

$colors = [
	[
		[
			'name' => 'Paper',
			'variable' => '--paper',
		],
		[
			'name' => 'Ink',
			'variable' => '--ink',
		],
	],
	[
		[
			'name' => 'Gray',
			'variable' => '--gray',
		],
		[
			'name' => 'Gray Light',
			'variable' => '--gray-light',
		],
		[
			'name' => 'Gray Lighter',
			'variable' => '--gray-lighter',
		],
		[
			'name' => 'Gray Dark',
			'variable' => '--gray-dark',
		],
		[
			'name' => 'Gray Darker',
			'variable' => '--gray-darker',
		],
	],

	[
		[
			'name' => 'Primary',
			'variable' => '--color',
		],
		[
			'name' => 'Secondary',
			'variable' => '--highlight',
		],
		[
			'name' => 'Tertiary',
			'variable' => '--color-tertiary',
		],
	],
	[
		[
			'name' => 'Primary Light',
			'variable' => '--color-light',
		],
		[
			'name' => 'Primary Lighter',
			'variable' => '--color-lighter',
		],
		[
			'name' => 'Primary Lightest',
			'variable' => '--color-lightest',
		],
	],
	[
		[
			'name' => 'Primary Dark',
			'variable' => '--color-dark',
		],
		[
			'name' => 'Primary Darker',
			'variable' => '--color-darker',
		],
		[
			'name' => 'Primary Darkest',
			'variable' => '--color-darkest',
		],
	],
	[
		[
			'name' => 'Secondary Light',
			'variable' => '--highlight-light',
		],
		[
			'name' => 'Secondary Lighter',
			'variable' => '--highlight-lighter',
		],
		[
			'name' => 'Secondary Lightest',
			'variable' => '--highlight-lightest',
		],
	],
	[
		[
			'name' => 'Secondary Dark',
			'variable' => '--highlight-dark',
		],
		[
			'name' => 'Secondary Darker',
			'variable' => '--highlight-darker',
		],
		[
			'name' => 'Secondary Darkest',
			'variable' => '--highlight-darkest',
		],
	],

	[
		[
			'name' => 'Success',
			'variable' => '--success',
		],
		[
			'name' => 'Warning',
			'variable' => '--warning',
		],
	],
	[
		[
			'name' => 'Gradient Dark',
			'variable' => '--gradient-dark',
		],
		[
			'name' => 'Gradient Light',
			'variable' => '--gradient-light',
		],
		[
			'name' => 'Gradient Color',
			'variable' => '--gradient-color',
		],
		[
			'name' => 'Gradient Color Dark',
			'variable' => '--gradient-color-dark',
		],

		[
			'name' => 'Gradient Highlight',
			'variable' => '--gradient-highlight',
		]
	],
	[
		[
			'name' => 'checkers',
			'class' => 'checkers',
		],
		[
			'name' => 'Diagonal',
			'class' => 'diagnol',
		],
		[
			'name' => 'Points',
			'class' => 'points',
		],
	]
];
?>


<color-guide>
	<h2 class="attention-voice">Colors</h2>
	<p>
		These are the colors used in the app. They are defined in
		<code>settings.css</code> and are available as CSS variables which are
		used throughout the app.
	</p>


	<?php foreach ($colors as $colorGroup) { ?>
		<ul class="colors">
			<?php foreach ($colorGroup as $color) { ?>
				<li class="colors">

					<?php if (isset($color['class'])) { ?>
						<div class="pallete <?= $color['class'] ?>" />
						<div class="color-name">
							<code>.<?= $color['class'] ?></code>
						</div>
					<?php } else { ?>
						<div class="pallete" style="background: var(<?= $color['variable'] ?>)" />
						<div class="color-name">
							<code><?= $color['variable'] ?></code>
						</div>
					<?php } ?>

				</li>
			<?php } ?>
		</ul>
	<?php } ?>

	<form-field class="color-slider">
		<label for="color">Hue: <span>3</span></label>
		<input type="range" id="color-slider" min='0' max="360" value="3" step="1" />

	</form-field>
</color-guide>

<script>
	const colorSlider = document.querySelector('.color-slider input');
	const colorSliderLabelSpan = document.querySelector('.color-slider label span');

	colorSlider.addEventListener('input', (e) => {
		const hue = e.target.value;
		document.documentElement.style.setProperty('--hue', hue);
		document.documentElement.style.setProperty('--hue-rotate', `${hue - 3}deg`);
		colorSliderLabelSpan.innerText = hue;
	})
</script>

<style>
	color-guide {
		display: grid;
		gap: 3rem;
		--gap: 1rem;
	}

	color-guide .colors {
		display: grid;
		gap: var(--gap);
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
	}

	@media (min-width: 768px) {
		color-guide .colors {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			--gap: 3rem;
		}
	}

	color-guide div.pallete {
		width: 100%;
		height: 100px;

		border: 1px solid var(--gray);
		border-radius: var(--corners);
		margin-bottom: 0.5rem;

		display: grid;
		place-items: center;
		text-align: center;

	}

	color-guide code {
		font-size: var(--step--1);
	}

	color-guide form-field {
		max-width: 50%;
	}
</style>