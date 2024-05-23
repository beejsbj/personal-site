<resume-card>
	<h1 class="firm-voice">
		<?= $role ?>
	</h1>
	<h3 class="notice-voice">
		<?= $place ?>
	</h3>
	<h2 class="solid-voice">
		<?= $startDate ?> -
		<?= $endDate ?>
	</h2>


	<?php
	if (isset($experience["duties"])) {
		$dutiesArr = $experience["duties"];
		echo "<ul>";
		echo "<h4 class='calm-voice'><strong>Duties</strong></h4>";

		foreach ($dutiesArr as $duty) {
			echo "<li>$duty</li>";
		}

		echo "</ul>";
	}
	if (isset($experience["skills"])) {
		$skillsArr = $experience["skills"];
		echo "<ul>";
		echo "<h4 class='calm-voice'><strong>Skills</strong></h4>";

		foreach ($skillsArr as $skill) {
			echo "<li>$skill</li>";
		}

		echo "</ul>";
	}

	if (isset($experience["specialNote"])) {
		$specialNote = $experience["specialNote"];
		echo "<blockquote><p class='whisper-voice'>$specialNote</p></blockquote>";
	}

	?>
</resume-card>