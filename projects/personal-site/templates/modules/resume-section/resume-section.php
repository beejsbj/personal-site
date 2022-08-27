<resume-section>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
<ul class="resume-section">
	<?php

		$items = $section['items'];
	 	foreach ($items as $experience) {
	 		$role = $experience['role'];
            $place = $experience["place"];

            $startDate = $experience["dates"][0];
            $endDate = $experience["dates"][1] ?? "present";

            echo "<li>";
			include('templates/modules/resume-section/resume-card.php');
			echo "</li>";
		} ?>
</ul>
</resume-section>