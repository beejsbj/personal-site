<h1 class="loud-voice">List</h1>


<image-grid>
	<?php
	$jollyRogerArr = getDatabase();


	foreach ($jollyRogerArr as $jollyRoger) {

		// stores the key of each array in var
		$keyID = array_search($jollyRoger, $jollyRogerArr);
		$imageUrl = $jollyRogerArr[$keyID]['imageUrl'];

	?>
		<a href="?page=detail&jollyroger=<?=$keyID?>">
			<picture class="flag hvr-wobble-top">
				<img src="<?=$imageUrl?>">
			</picture>
		</a>

	<?php } ?>
	
</image-grid>

		





		

