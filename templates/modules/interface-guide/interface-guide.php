<?php

$elements = [
	[
		"name" => "Primary Button",
		"content" => "Button",
		"class" => "button",
	],
	[
		"name" => "Outline Button",
		"content" => "Button",
		"class" => "button outline",
	],
	[
		"name" => "Icon Button",
		"content" => "⋯",
		"class" => "button icon",
	],
	[
		"name" => "Text Button/Link",
		"content" => "Button",
		"class" => "text",
	],
]

?>


<style>
	ul.element-groups {
		display: grid;
		gap: var(--space-l);
		margin-top: var(--space-l);


	}

	ul.elements {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-s);
		margin-top: var(--space-s);

		li {
			flex: 1;
		}


		@media (min-width: 768px) {
			/* grid-template-columns: 1fr 1fr 1fr 1fr; */
		}
	}
</style>


<div class="ui-elements-guide">
	<h2 class="attention-voice">UI Elements</h2>
	<p>
		These are the UI elements used in the app. They are defined in
		<code>settings.css</code> and are available as CSS variables and classes
		which are used throughout the app.
	</p>

	<ul class="element-groups">
		<?php foreach ($elements as $element) { ?>
			<li>
				<h3 class="notice-voice">
					<?= $element['name'] ?>
				</h3>
				<p class="element-name">
					<code>.<?= $element['class'] ?></code>
				</p>
				<ul class="elements">
					<li>
						<h4 class="whisper-voice">
							Default
						</h4>
						<button class="default <?= $element['class'] ?>">
							<?= $element['content'] ?>
						</button>
					</li>
					<li>
						<h4 class="whisper-voice">
							Hover
						</h4>
						<button class="hover <?= $element['class'] ?>">
							<?= $element['content'] ?>
						</button>
					</li>
					<li>
						<h4 class="whisper-voice">
							Active
						</h4>
						<button class="active <?= $element['class'] ?>">
							<?= $element['content'] ?>
						</button>
					</li>
					<li>
						<h4 class="whisper-voice">
							Loading
						</h4>
						<button class="loading <?= $element['class'] ?>">
							<?= $element['content'] ?>
						</button>
					</li>
					<li>
						<h4 class="whisper-voice">
							Disabled
						</h4>
						<button disabled class="disabled <?= $element['class'] ?>">
							<?= $element['content'] ?>
						</button>
					</li>
				</ul>

			</li>
		<?php } ?>
	</ul>
</div>