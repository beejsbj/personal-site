


<goals-module>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
<ul >

	<?php
		$items = $section['items'] ?? ["This is a goal", "This is a goal"];
	 	foreach ($items as $goal) {
		echo "<li>";
		echo $goal;
		echo "</li>";
	} ?>
</ul>
</goals-module>