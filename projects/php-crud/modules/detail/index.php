<?php
	$jollyRogerArr = getDatabase();
	$keyID = $_GET["jollyroger"]; //get index key for to find image url
	$imageUrl = $jollyRogerArr[$keyID]['imageUrl'];
	$title = $jollyRogerArr[$keyID]['title'];
	$description = $jollyRogerArr[$keyID]['description'];

	if (isset($_POST['deleted'])) {
		unset($jollyRogerArr[$keyID]);
		writeData($jollyRogerArr);
		header("Location: index.php?page=list");
	}


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

		<form method="POST">
			<button class="btn-1" type="submit" name="deleted"> delete flag </button>
		</form>
	</text-content>
</jolly-roger>
