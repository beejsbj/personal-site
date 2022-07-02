<?php
	$jollyRogerArr = getDatabase();
	$keyID = $_GET["jollyroger"]; //get index key for to find image url
	$imageUrl = $jollyRogerArr[$keyID]['imageUrl'];
	$title = $jollyRogerArr[$keyID]['title'];
	$description = $jollyRogerArr[$keyID]['description'];

	?>
<jolly-roger>
	<picture>
		<img src="<?=$imageUrl?>" alt="">
	</picture>
	<text-content>
		<h1 class="attention-voice">
			<?=$title?>
		</h1>
		<p class="calm-voice">
			<?=$description?>
		</p>
	</text-content>
</jolly-roger>