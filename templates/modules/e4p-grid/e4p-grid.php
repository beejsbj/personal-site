<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the E4P module";
?>

<h2 class="loud-voice">
	<?=$sectionHeading?>
</h2>
<e4p-grid>

	<?php
		$chapters = $section['chapters'] ?? [1, 2];
		foreach ($chapters as $chapter) {
			$chapterHeading = $chapter['heading'] ?? "E4P chapter heading";
			$chapterDesc = $chapter['description']  ?? "E4P chapter description";
			$chapterSvg = $chapter['svg']  ?? "xyz.svg";
			$chapterExercises = $chapter['exercises'] ?? [1, 2, 3, 4];?>

			<e4p-chapter>
				<h1 class='attention-voice'>
				<?=$chapterHeading?>
				</h1>

				<p class="whisper-voice">
				<?=$chapterDesc?>
				</p>

				<ul>
				<?php
				 	foreach ($chapterExercises as $exercise) {
				 		$exName = $exercise['name'] ?? "exercise name";
				 		$exNumber = $exercise['number']  ?? "exercise Number";
				 		$exDesc = $exercise['description']  ?? "exercise chapterDesc";
				 		$exLink = $exercise['slug'] ?? "?page=exercise-detail&exercise=" . getKebabCase($exName);
				 		?>

						<li>
							<a href="<?=$exLink?>"><?=$exName?></a>
						</li>
				<?php } ?>
				</ul>
			</e4p-chapter>
	<?php } ?>
</e4p-grid>