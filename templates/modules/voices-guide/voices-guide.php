<?php

$voices = [
	'micro-voice',
	'solid-voice',
	'whisper-voice',
	'calm-voice',
	'notice-voice',
	'firm-voice',
	'attention-voice',
	'loud-voice',
	'booming-voice',
];

?>

<style>
	.text-voices ul {
		display: grid;
		gap: var(--space-2xl);
		margin-top: var(--space-l);
	}
</style>


<div class="text-voices">
	<h2 class="attention-voice">Type Voices</h2>
	<ul>


		<?php foreach ($voices as $voice) { ?>
			<li>
				<div class="voice-card <?= $voice ?>">
					<h3>
						<code>
							<?= $voice ?>
						</code>
					</h3>
					<p class="<?= $voice ?>">
						this is a <em>regular emphasis</em> sentence.
					</p>
					<p class="<?= $voice ?>">
						This is a <strong>strong emphasis</strong> sentence.
					</p>
					<p class="<?= $voice ?>">
						This is a
						<strong><em>strong and regular emphasis</em></strong> sentence.
					</p>
					<p class="<?= $voice ?>">
						This is a sentence with a <mark class="highlight">highlight </mark>.
					</p>
					<p class="<?= $voice ?>">
						these <a href="?page=style-guide#"> are links </a> in the paragraph.
					</p>
					<p class="<?= $voice ?>" class="wrap">
						This is a paragraph that should wrap to the next line. lorem ipsum
						dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.
						Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra
						nec consectetur ante hendrerit.
					</p>
				</div>
			</li>
		<?php } ?>



	</ul>
</div>