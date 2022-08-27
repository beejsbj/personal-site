<?php

function dasher($string){
	        //lowercase the string
	        //split string at space 
	        $splitString = explode(" ", $string);

	        //add dashes 
	        $finalString = implode("-", $splitString);

	        return strtolower($finalString);
	    }

?>

<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
<e4p-grid>

	<?php
	$chapters = $section['chapters'];
	foreach ($chapters as $chapter) {
	$chapterHeading = $chapter['heading'];
	$chapterDesc = $chapter['description'];
	$chapterSvg = $chapter['svg'];
	$chapterExercises = $chapter['exercises'];?>

	<e4p-chapter>

	
		<h2 class='attention-voice'>
		<?=$chapterHeading?>
		</h2>

		<p>
		<?=$chapterDesc?>
		</p>

		<ul>
		<?php
		 	foreach ($chapterExercises as $exercise) {
		 		$exName = $exercise['name'];
		 		$exNumber = $exercise['number'];
		 		$exDesc = $exercise['description'];
		 		$exLink = dasher($exName);
		 		?>

				<li>
					<a href="?page=e4p&exercise=<?=$exLink?>"><?=$exName?></a>
				</li>
		<?php } ?>
		</ul>";

		

	</e4p-chapter>
	<?php } ?>
</e4p-grid>