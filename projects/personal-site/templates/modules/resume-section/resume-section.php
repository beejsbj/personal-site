<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the Resume module";
	$experiences = $section['experiences'] ?? [1, 2, 3];
?>
<resume-section>
	<h2 class="loud-voice">
	<?=$sectionHeading?>
</h2>
<ul class="resume-section">
	<?php

		
	 	foreach ($experiences as $experience) {
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