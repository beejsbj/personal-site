<resume-card>
	 <h1 class="attention-voice">
    <?=$role?>
</h1>
<h2 class="solid-voice">
    <?=$startDate?> -
    <?=$endDate?>
</h2>
<h3 class="notice-voice">
    <?=$place?>
</h3>

<?php 
if (isset($experience["duties"])) {
    $dutiesArr = $experience["duties"];
 	echo "<h4 class='firm-voice'>Duties</h4>";
	echo "<ul>";

	    foreach ($dutiesArr as $duty) {
	        echo "<li>$duty</li>";
	    }
	    
	echo "</ul>";
}
if (isset($experience["skills"])) {
	$skillsArr = $experience["skills"];
 	echo "<h4 class='firm-voice'>Skills</h4>";
	echo "<ul>";

	    foreach ($skillsArr as $skill) {
	        echo "<li>$skill</li>";
	    }
	    
	echo "</ul>";
}

if (isset($experience["specialNote"])) {
                $specialNote = $experience["specialNote"];
                 echo "<blockquote>$specialNote</blockquote>";
            }

?>
</resume-card>