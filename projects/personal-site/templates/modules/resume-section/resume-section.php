<resume-section>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
<ul class="resume-section">
	<?php

		$items = $section['items'] ?? [1, 2, 3];
	 	foreach ($items as $experience) {
	 		$role = $experience['role'] ?? "Role or Position";
            $place = $experience["place"]  ?? "Location";

            $startDate = $experience["dates"][0] ?? "start date";
            $endDate = $experience["dates"][1] ?? "present";

            echo "<li>";
			include('templates/modules/resume-section/resume-card.php');
			echo "</li>";
		} ?>
</ul>
</resume-section>