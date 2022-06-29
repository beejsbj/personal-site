


<jolly-grid>
	<?php

	foreach ($skulls as $skull) {
		?>

	<a href="?jollyroger=<?=$skull['day']?>">
		<picture>
			<img src="images/<?=$skull['image']?>" alt="">
		</picture>
	</a>

	<?php } ?>
	
</jolly-grid>

		

