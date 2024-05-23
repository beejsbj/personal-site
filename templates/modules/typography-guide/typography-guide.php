<?php

$groups = [
	[
		"heading" => "Font Family",
		"property" => "font-family",
		"settings" => [
			[
				"name" => "Headings",
				"variable" => "--font-head",
			],
			[
				"name" => "Body",
				"variable" => "--font-body",
			],
		]
	],
	[
		"heading" => "Font Weights",
		"property" => "font-weight",
		"settings" => [
			[
				"name" => "Light",
				"variable" => "--weight-light",
			],
			[
				"name" => "Regular",
				"variable" => "--weight-regular",
			],
			[
				"name" => "Heavy",
				"variable" => "--weight-heavy",
			],
		]
	],
	[
		"heading" => "Line Heights",
		"property" => "line-height",
		"content" => "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in turpis nec felis ultricies ultricies. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in turpis nec felis ultricies ultricies.",
		"settings" => [
			[
				"name" => "Heading",
				"variable" => "--line-height-head",
			],
			[
				"name" => "Body",
				"variable" => "--line-height-body",
			]
		]
	],
	[
		"heading" => "Letter Spacing",
		"property" => "letter-spacing",
		"settings" => [
			[
				"name" => "Heading",
				"variable" => "--letter-spacing-head",
			],
			[
				"name" => "Body",
				"variable" => "--letter-spacing-body",
			]
		]
	],
	[
		"heading" => "Font Sizes",
		"property" => "font-size",
		"settings" => [
			[
				"name" => "Step -3",
				"variable" => "--font-size--3",
			],
			[
				"name" => "Step -2",
				"variable" => "--font-size--2",
			],
			[
				"name" => "Step -1",
				"variable" => "--font-size--1",
			],
			[
				"name" => "Step 0",
				"variable" => "--font-size-0",
			],
			[
				"name" => "Step 1",
				"variable" => "--font-size-1",
			],
			[
				"name" => "Step 2",
				"variable" => "--font-size-2",
			],
			[
				"name" => "Step 3",
				"variable" => "--font-size-3",
			],
			[
				"name" => "Step 4",
				"variable" => "--font-size-4",
			],
			[
				"name" => "Step 5",
				"variable" => "--font-size-5",
			],
			[
				"name" => "Step 6",
				"variable" => "--font-size-6",
			],
			[
				"name" => "Step 7",
				"variable" => "--font-size-7",
			],
		]
	],
];

?>


<style>
	ul.typography-groups {
		display: grid;
		gap: var(--space-l);
		margin-top: var(--space-l);
	}

	ul.typography-settings {
		display: grid;
		/* grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); */
		gap: var(--space-s);
	}

	div.type-pallete {
		border: var(--border);
		padding: var(--space-s);
		font-size: var(--font-size-2);

	}
</style>


<div class="typography-guide">
	<h2 class="attention-voice">Typography</h2>
	<p>
		These are the typography settings used in the app. They are defined in
		<code>settings.css</code> and are available as CSS variables which are
		used throughout the app.
	</p>

	<ul class="typography-groups">
		<?php foreach ($groups as $group) { ?>
			<li>
				<h3 class="notice-voice">
					<?= $group['heading'] ?>
				</h3>
				<ul class="typography-settings">
					<?php foreach ($group['settings'] as $setting) {
						$name = $setting['name'];
						$property = $group['property'];
						$variable = $setting['variable'];
						$style = "$property: var($variable);";
						$content = isset($group['content']) ? $group['content'] : 'The quick brown fox jumps over the lazy dog.';

					?>
						<li>
							<h4 class="whisper-voice">
								<?= $name ?>
							</h4>
							<div class="type-pallete" style="<?= $style ?>">
								<span>
									<?= $content ?>
								</span>
							</div>
							<p>
								<code>
									<?= $variable ?>
								</code>
							</p>
						</li>
					<?php } ?>
				</ul>
			</li>
		<?php } ?>
	</ul>
</div>


<script>
	function setFontDetails() {
		const voices = document.querySelectorAll('voice-card');
		voices.forEach(voice => {
			const voiceName = voice.dataset.voice;
			const paragraph = voice.querySelector(`p.${voiceName}`);
			const family = window.getComputedStyle(paragraph).fontFamily;
			const size = window.getComputedStyle(paragraph).fontSize;
			voice.querySelector('.family').innerText = family;
			voice.querySelector('.size').innerText = size;
		});


	}

	setFontDetails();

	window.addEventListener('resize', setFontDetails);
</script>