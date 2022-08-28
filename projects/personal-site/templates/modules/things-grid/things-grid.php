<ul>

	<?php
		$items = $section['items'];
	 	foreach ($items as $item) {
			$itemTitle = $item['title'];
			$itemCopy = $item['copy'];
			echo "<li>";
			echo "<h3 class='notice-voice'>$itemTitle</h3>";
			echo "<p class='calm-voice'>$itemCopy</p>";
			echo "</li>";
		} ?>
</ul>