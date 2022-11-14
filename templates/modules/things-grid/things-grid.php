<ul>
	<?php
		$items = $section['items'] ?? [1, 2, 3];
	 	foreach ($items as $item) {
			$itemTitle = $item['title'] ?? 'Thing Title';
			$itemCopy = $item['copy'] ?? 'Nostrud amet Lorem aute quis qui anim sit officia. Eu ea incididunt minim non. Aute proident ad amet laborum sit id est et qui eiusmod excepteur dolore consequat commodo.';
			echo "<li>";
			echo "<h3 class='notice-voice'>$itemTitle</h3>";
			echo "<p class='calm-voice'>$itemCopy</p>";
			echo "</li>";
		} ?>
</ul>