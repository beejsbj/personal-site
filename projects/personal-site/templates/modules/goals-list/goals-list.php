<goals-module>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
<ul >

	<?php
		$items = $section['items'];
	 	foreach ($items as $goal) {
		echo "<li>";
		echo $goal;
		echo "</li>";
	} ?>
</ul>
</goals-module>