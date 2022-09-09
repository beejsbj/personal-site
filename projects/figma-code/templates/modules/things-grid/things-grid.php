<ul class="<?=$id?>">

	<?php
		$items = $section['items'];
	 	foreach ($items as $item) {
		$itemTitle = $item['title'];
		$itemCopy = $item['copy'];
		echo "<li>";
		echo "<h3 class='notice-voice'>";
		echo $itemTitle;
		echo "</h3>";
		echo "<p class='calm-voice'>";
		echo $itemCopy;
		echo "</p>";
		echo "</li>";
	} ?>
</ul>