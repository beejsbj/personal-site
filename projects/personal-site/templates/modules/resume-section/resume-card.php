<resume-card>
	 <h1>
    <?=$role?>
</h1>
<h2 class="dates">
    <?=$startDate?> -
    <?=$endDate?>
</h2>
<h3>
    <?=$place?>
</h3>

<?php 
if (isset($experience["duties"])) {
    $dutiesArr = $experience["duties"];
 	echo "<h4>Duties</h4>";
	echo "<ul>";

	    foreach ($dutiesArr as $duty) {
	        echo "<li'>$duty</li>";
	    }
	    
	echo "</ul>";
}
if (isset($experience["skills"])) {
	$skillsArr = $experience["skills"];
 	echo "<h4>Skills</h4>";
	echo "<ul>";

	    foreach ($skillsArr as $skill) {
	        echo "<li'>$skill</li>";
	    }
	    
	echo "</ul>";
}

if (isset($experience["specialNote"])) {
                $specialNote = $experience["specialNote"];
                 echo "<blockquote>$specialNote</blockquote>";
            }

?>
</resume-card>