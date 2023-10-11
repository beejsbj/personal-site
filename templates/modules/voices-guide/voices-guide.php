<?php $voices = $section['voices']; ?>




<voices-guide>
	<h2 class="loud-voice">Type Voices</h2>
	<?php foreach ($voices as $voice) { ?>
		<voice-card data-voice="<?= $voice ?>">
			<code>
				<?= $voice ?>
			</code>
			<p class="<?= $voice ?>">THe font family is <mark class="family"></mark></p>
			<p class="<?= $voice ?>">THe font size is <mark class="size"></mark></p>
			<p class="<?= $voice ?>">This is a paragraph that should wrap to the next line. lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit.</p>
			<p class="<?= $voice ?>">Nam tincidunt congue enim, ut porta lorem lacinia consectetur. Donec ut libero sed arcu vehicula ultricies a non tortor. Lorem ipsum dolor sit amet, <a href="#" class="text">consectetur adipiscing elit</a>. Aenean ut gravida lorem. Ut turpis felis, pulvinar a semper sed, adipiscing id dolor. Pellentesque auctor nisi id magna consequat sagittis. Curabitur dapibus enim sit amet elit pharetra tincidunt feugiat nisl imperdiet. </p>
			<p class="<?= $voice ?>">these <a class="text" href='?page=style-guide#'> are links </a> in the paragraph.</p>
			<p class="<?= $voice ?>">this is a <em>regular emphasis</em> sentence.</p>
			<p class="<?= $voice ?>">This is a <strong>strong emphasis</strong> sentence.</p>
			<p class="<?= $voice ?>">This is a <strong><em>strong and regular emphasis</em></strong> sentence.</p>
		</voice-card>
	<?php } ?>
</voices-guide>


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