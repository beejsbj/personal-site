<?php

$buttons = [
	[
		'name' => 'Primary',
		'class' => 'button',
	],
	[
		'name' => 'Outline',
		'class' => 'button outline',
	],
	[
		'name' => 'Bubble',
		'class' => 'button bubble',
	],
	[
		'name' => '✅',
		'class' => 'button icon',
	],
	[
		'name' => 'Text Link',
		'class' => 'text',
	],
];




?>


<interface-guide>
	<text-content>
		<h2 class="attention-voice">
			UI elements
		</h2>
		<p>
			These are the buttons, links, and other UI elements used in the app.
		</p>

	</text-content>
	<ul>
		<?php foreach ($buttons as $button) { ?>
			<li>
				<button class="<?= $button['class'] ?>">
					<?= $button['name'] ?>
				</button>
			</li>
		<?php } ?>

	</ul>
</interface-guide>


<style>
	interface-guide {
		display: grid;
		gap: var(--space-xl);
	}

	interface-guide ul {
		display: grid;
		gap: var(--space-xl);
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}
</style>