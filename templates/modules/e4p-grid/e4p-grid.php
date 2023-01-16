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
				<aside>
					<p class="whisper-voice"></p>
				</aside>

				<ul>
				<?php
				 	foreach ($chapterExercises as $exercise) {
				 		$exNumber = $exercise['number']  ?? "exercise Number";
				 		$exName = $exercise['name'] ?? "exercise name";
				 		$exDesc = $exercise['description']  ?? "exercise chapterDesc";
				 		$exSlug = $exercise['slug'] ?? "$exNumber-" . getKebabCase($exName);

				 		if (!exExists($exSlug) && !isset($exercise['slug'])) {
				 			continue;
				 		}
				 		?>
						<li>
							<a href="e4p/<?=$exSlug?>">
								<?=$exName?>
							</a>
							<p><?=$exDesc?></p>
						</li>
				<?php } ?>
				</ul>
			</e4p-chapter>
	<?php } ?>
</e4p-grid>

<script>
	window.addEventListener("mousemove", function (event) {
		if (event.target.matches("e4p-chapter li a")) {
			var $paragraph = event.target.closest('li').querySelector('p');
			var $aside = event.target.closest('e4p-chapter').querySelector("aside p");
			$aside.innerHTML = $paragraph.innerHTML;
		}
	});

	$chaptersList = document.querySelectorAll('e4p-chapter ul')
	$chaptersList.forEach(function (list) {
		if (!list.children.length) {
			$chapter = list.closest( 'e4p-chapter' );
			$chapter.style.display = 'none';
		}
	})
</script>