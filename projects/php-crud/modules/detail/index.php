


	<?php
	$jollyRogerArr = getDatabase();
	$keyID = $_GET["jollyroger"]; //get index key for to find image url
	$imageUrl = $jollyRogerArr[$keyID]['imageUrl'];
	$title = $jollyRogerArr[$keyID]['title'];

	?>

<jolly-roger>
	<picture>
	<img src="images/<?=$imageUrl?>" alt="">
</picture>
<h1 class="attention-voice">
	<?=$title?>
</h1>
</jolly-roger>

	

