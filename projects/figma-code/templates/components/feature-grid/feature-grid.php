<?php 
	$featureGrid = $components['feature-grid'];

	foreach ($featureGrid as $featureCard) {
		$image = $featureCard['image'];
		$heading = $featureCard['heading'];
		$paragraph = $featureCard['paragraph'];
		?>


<feature-grid>
	<feature-card>
		<picture>
			<img src="images/<?=$image?>" alt="">
		</picture>
		<h1>
			<?=$heading?>
		</h1>
		<p>
			<?=$paragraph?>
		</p>
	</feature-card>
</feature-grid>

<?php } ?>