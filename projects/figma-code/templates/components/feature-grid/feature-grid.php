<feature-grid>

	<?php 
	$featureGrid = $components['feature-grid'];

	foreach ($featureGrid as $featureCard) {
		$image = $featureCard['image'];
		$heading = $featureCard['heading'];
		$paragraph = $featureCard['paragraph'];
		?>



	<feature-card>
		<picture>
			<img src="images/<?=$image?>" alt="">
		</picture>
		<h1 class="solid-voice">
			<?=$heading?>
		</h1>
		<p class="whisper-voice">
			<?=$paragraph?>
		</p>
	</feature-card>


<?php } ?>

</feature-grid>