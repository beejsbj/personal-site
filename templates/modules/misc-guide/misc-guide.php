<?php

$settingGroups = [
	[
		"heading" => "Borders",
		"property" => "border",
		"settings" =>  [
			[
				'name' => 'Border',
				'variable' => '--border',
			],
			[
				'name' => 'Border light',
				'variable' => '--border-light',
			],
			[
				'name' => 'Border Color',
				'variable' => '--border-color',
			],
			[
				'name' => 'Border Highlight',
				'variable' => '--border-highlight',
			],
			[
				'name' => 'Border gradient',
				'variable' => '--border-gradient',
				'property' => 'border-image',
			],
		]
	],
	[
		"heading" => "Shadows",
		"property" => "box-shadow",
		"settings" =>  [
			[
				'name' => 'Shadow',
				'variable' => '--shadow',
			],
			[
				'name' => 'Shadow Inner',
				'variable' => '--shadow-inner',
			],
		]
	],
];
?>

<style>
	ul.setting-groups {
		display: grid;
		gap: var(--space-l);
		margin-top: var(--space-l);
	}


	ul.misc-settings {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: var(--space-s);

		@media (min-width: 768px) {
			grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
		}



		div.setting-pallete {
			width: 100%;
			aspect-ratio: var(--ratio-square);
		}
	}
</style>

<div class="misc-guide">
	<h2 class="attention-voice">Borders, Shadows and Miscellaneus</h2>
	<p>
		These are the styles used in the app. They are defined in
		<code>settings.css</code> and are available as CSS variables and classes
		which are used throughout the app.
	</p>
	<!-- <ul class="settings" v-for="settingGroup in settings">
      <li v-for="setting in settingGroup" :key="setting.name">
        <div :class="setting.name">
          <code>{{ setting.variable }}</code>
        </div>
      </li>
    </ul> -->

	<ul class="setting-groups">
		<?php foreach ($settingGroups as $settingGroup) { ?>
			<li>
				<h3 class="notice-voice">
					<?= $settingGroup['heading'] ?>
				</h3>
				<ul class="misc-settings">
					<?php foreach ($settingGroup['settings'] as $setting) {
						$name = $setting['name'];
						$property = isset($setting['property']) ? $setting['property'] : $settingGroup['property'];
						$variable = isset($setting['variable']) ? $setting['variable'] : '';
						$style = "$property: var($variable);";

					?>
						<li>
							<h4 class="whisper-voice">
								<?= $setting['name'] ?>
							</h4>
							<div class="setting-pallete" style="<?= $style ?>">
							</div>
							<p class="setting-name">
								<code><?= $variable ?></code>
							</p>

						</li>
					<?php } ?>
				</ul>
			</li>
		<?php } ?>
</div>