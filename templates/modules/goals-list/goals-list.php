<?php
// if heading exists condition
$sectionHeading = $section['heading'] ?? "This is the goals module";
?>


<goals-module>
	<h2 class="loud-voice">
		<?= $sectionHeading ?>
	</h2>
	<ul>

		<?php
		$goals = $section['goals'] ?? ["This is a goal", "This is a goal"];
		foreach ($goals as $goal) {
			echo "<li>$goal</li>";
		} ?>
	</ul>
</goals-module>