<?php

$spaces = [
	[
		"name" => "XXXS",
		"variable" => "--space-3xs",
	],
	[
		"name" => "XXS",
		"variable" => "--space-2xs",
	],
	[
		"name" => "XS",
		"variable" => "--space-xs",
	],
	[
		"name" => "S",
		"variable" => "--space-s",
	],
	[
		"name" => "M",
		"variable" => "--space-m",
	],
	[
		"name" => "L",
		"variable" => "--space-l",
	],
	[
		"name" => "XL",
		"variable" => "--space-xl",
	],
	[
		"name" => "XXL",
		"variable" => "--space-2xl",
	],
	[
		"name" => "XXXL",
		"variable" => "--space-3xl",
	],
];
?>

<style>
	ul.spaces {
		margin-top: var(--space-l);
	}

	.space-guide li {
		display: grid;
		grid-template-columns: 0.5fr 1fr 1fr;
		gap: var(--space-s);
		/* grid-template-rows: var(--space-3xl); */
		align-items: center;
		justify-items: start;
		/* margin-top: var(--space-xs); */

		code {
			white-space: nowrap;
		}
	}

	div.space-pallete {
		height: var(--space-m);
		background: var(--color);
	}

	.space-guide {
		p+p {
			margin-top: 0;
		}
	}
</style>



<div class="space-guide">
	<h2 class="attention-voice">Spacing</h2>
	<p>
		These are the spacing values used in the app. They are defined in
		<code>settings.css</code> and are available as CSS variables which are
		used throughout the app for
		<span class="highlight">Margins, Paddings and Gaps</span>
	</p>
	<ul class="spaces">
		<?php foreach ($spaces as $space) { ?>
			<li>
				<p>
					<?= $space['name'] ?>
				</p>


				<p>
					<code>
						<?= $space['variable'] ?>
					</code>

				</p>
				<div class="space-pallete" style="width: var(<?= $space['variable'] ?>)"></div>
			</li>
		<?php } ?>

	</ul>
</div>

<script>
	function getPixel(name) {
		const div = document.querySelector(`div.${name}`);
		const style = window.getComputedStyle(div);
		const width = style.getPropertyValue("width");
		return width;
	}
</script>