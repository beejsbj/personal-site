<?php

$colorGroups = [
	[
		"heading" => "Base Colors",

		"colors" => [
			[
				"name" => "Paper",
				"variable" => "--paper",
			],
			[
				"name" => "Ink",
				"variable" => "--ink",
			],
		]
	],
	[

		"heading" => "Grays",
		"colors" => [
			[
				"name" => "Gray Lightest",
				"variable" => "--gray-lightest",
			],
			[
				"name" => "Gray Lighter",
				"variable" => "--gray-lighter",
			],
			[
				"name" => "Gray Light",
				"variable" => "--gray-light",
			],
			[
				"name" => "Gray",
				"variable" => "--gray",
				"class" => "base"
			],
			[
				"name" => "Gray Dark",
				"variable" => "--gray-dark",
			],
			[
				"name" => "Gray Darker",
				"variable" => "--gray-darker",
			],
			[
				"name" => "Gray Darkest",
				"variable" => "--gray-darkest",
			],
		]
	],

	[
		"heading" => "Primary Color",
		"colors" => [
			[
				"name" => "Primary Lightest",
				"variable" => "--color-lightest",
			],
			[
				"name" => "Primary Lighter",
				"variable" => "--color-lighter",
			],
			[
				"name" => "Primary Light",
				"variable" => "--color-light",
			],
			[
				"name" => "Primary",
				"variable" => "--color",
				"class" => "base"

			],
			[
				"name" => "Primary Dark",
				"variable" => "--color-dark",
			],
			[
				"name" => "Primary Darker",
				"variable" => "--color-darker",
			],
			[
				"name" => "Primary Darkest",
				"variable" => "--color-darkest",
			],
		]
	],

	[
		"heading" => "Highlight Color",
		"colors" => [
			[
				"name" => "Highlight Lightest",
				"variable" => "--highlight-lightest",
			],
			[
				"name" => "Highlight Lighter",
				"variable" => "--highlight-lighter",
			],
			[
				"name" => "Highlight Light",
				"variable" => "--highlight-light",
			],
			[
				"name" => "Highlight",
				"variable" => "--highlight",
				"class" => "base"
			],
			[
				"name" => "Highlight Dark",
				"variable" => "--highlight-dark",
			],
			[
				"name" => "Highlight Darker",
				"variable" => "--highlight-darker",
			],
			[
				"name" => "Highlight Darkest",
				"variable" => "--highlight-darkest",
			],
		]
	],
	[
		"heading" => "Accent Color",
		"colors" => [
			[
				"name" => "Accent Lightest",
				"variable" => "--accent-lightest",
			],
			[
				"name" => "Accent Lighter",
				"variable" => "--accent-lighter",
			],
			[
				"name" => "Accent Light",
				"variable" => "--accent-light",
			],
			[
				"name" => "Accent",
				"variable" => "--accent",
				"class" => "base"
			],
			[
				"name" => "Accent Dark",
				"variable" => "--accent-dark",
			],
			[
				"name" => "Accent Darker",
				"variable" => "--accent-darker",
			],
			[
				"name" => "Accent Darkest",
				"variable" => "--accent-darkest",
			],
		]
	],

	[
		"heading" => "Semantic Colors",
		"colors" => [
			[
				"name" => "Success",
				"variable" => "--success",
			],
			[
				"name" => "Warning",
				"variable" => "--warning",
			],
			[
				"name" => "Error",
				"variable" => "--error",
			],
			[
				"name" => "Info",
				"variable" => "--info",
			]
		]
	],
	[
		"heading" => "Gradients",
		"colors" => [
			[
				"name" => "Gradient Dark",
				"variable-img" => "--gradient-dark",
			],
			[
				"name" => "Gradient Light",
				"variable-img" => "--gradient-light",
			],
			[
				"name" => "Gradient Color",
				"variable-img" => "--gradient-color",
			],
		]
	],
	[
		"heading" => "Patterns",
		"colors" => [
			[
				"name" => "Checkers",
				"variable" => "--gray",
				"variable-img" => "--checkers",
			],
			[
				"name" => "Diagnol",
				"variable" => "--gray",
				"variable-img" => "--diagnol",
			],
			[
				"name" => "Points",
				"variable" => "--gray",
				"variable-img" => "--points",
			],
			[
				"name" => "Noise",
				"variable" => "--gray",
				"variable-img" => "--noise",
				"class" => "noise"
			]
		]
	],
];
?>


<style>
	ul.color-groups {
		display: grid;
		gap: var(--space-l);
		margin-top: var(--space-l);
	}

	ul.colors {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: var(--space-s);

		@media (min-width: 768px) {
			grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
		}
	}

	ul.colors div.pallete {
		width: 100%;
		aspect-ratio: var(--ratio-square);
		border-radius: var(--corners);
		margin-bottom: var(--space-2xs);
		background-color: var(--pallete);
		background-image: var(--pallete-img);
		/* text-align: center; */
	}


	ul.colors div.pallete.base {
		outline: 5px solid var(--ink);
	}


	ul.colors div.pallete.noise {

		filter: var(--noise-filter);
	}
</style>

<div class="color-guide">
	<h2 class="attention-voice">Colors</h2>
	<p>
		These are the colors used in the app. They are defined in
		<code>settings.css</code> and are available as CSS variables which are
		used throughout the app.
	</p>

	<ul class="color-groups">
		<?php foreach ($colorGroups as $colorGroup) { ?>
			<li>
				<h3 class="notice-voice">
					<?= $colorGroup['heading'] ?>
				</h3>
				<ul class="colors">
					<?php foreach ($colorGroup['colors'] as $color) {


						$variable = '';
						$class = 'pallete';
						$varImg = '';
						$style = '';
						$code = '';

						if (isset($color['variable'])) {
							$variable = $color['variable'];
							$style = "--pallete: var($variable);";
							$code = $variable;
						}

						if (isset($color['class'])) {
							$class = $color['class'] . " pallete";
						}

						if (isset($color['variable-img'])) {
							$varImg = $color['variable-img'];
							$style = $style . " --pallete-img: var($varImg);";
							$code = $varImg;
						}

					?>
						<li>
							<h4 class="whisper-voice">
								<?= $color['name'] ?>
							</h4>
							<div class="<?= $class ?>" style="<?= $style ?>">
							</div>
							<p class="color-name">
								<code><?= $code ?></code>
							</p>
						</li>
					<?php } ?>
				</ul>
			</li>
		<?php } ?>
	</ul>
</div>