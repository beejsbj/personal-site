


<image-grid>
	<?php
	$jollyRogerArr = getDatabase();


	foreach ($jollyRogerArr as $jollyRoger) {

		// stores the key of each array in var
		$keyID = array_search($jollyRoger, $jollyRogerArr);
		$imageUrl = $jollyRogerArr[$keyID]['imageUrl'];
		$title = $jollyRogerArr[$keyID]['title'];
	?>
		<a href="?page=detail&jollyroger=<?=$keyID?>">
			<picture>
				<img src="images/<?=$imageUrl?>">
			</picture>
		</a>

	<?php } ?>
	
</image-grid>

		





		

