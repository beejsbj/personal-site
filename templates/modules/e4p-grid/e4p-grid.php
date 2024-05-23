<?php
// if heading exists condition
$sectionHeading = $section['heading'] ?? "This is the E4P module";

?>


<e4p-grid>

	<?php
	$chapters = $section['chapters'] ?? [1, 2];
	foreach ($chapters as $key => $chapter) {
		$chapterHeading = $chapter['heading'] ?? "E4P chapter heading";
		$chapterDesc = $chapter['description'] ?? "E4P chapter description";
		$chapterExercises = $chapter['exercises'] ?? [1, 2, 3, 4];

		$chapterNumber = $key + 1;
		$chapterSvg = "ch$chapterNumber.php";

	?>


		<e4p-chapter>
			<h1 class='attention-voice'>
				<?= $chapterHeading ?>
			</h1>

			<p class="whisper-voice">
				<?= $chapterDesc ?>
			</p>
			<aside>
				<p class="whisper-voice"></p>
			</aside>
			<nav>
				<ul>
					<?php
					foreach ($chapterExercises as $i) {
						$exercise = getExercise($i);
						$exNumber = $exercise['number'];
						$exName = $exercise['name'];
						$exDesc = $exercise['description'];
						// $exSlug = $exercise['slug'] ?? "e4p/$exNumber"; //pretty
						$exSlug = $exercise['slug'] ?? "?page=exercise-detail&exercise=$exNumber"; //ugly

						$exFileName = "$exNumber-" . getKebabCase($exName);

						if (!exExists($exFileName) && !isset($exercise['slug'])) {
							continue;
						}
					?>
						<li>
							<a class="text" href="<?= $exSlug ?>">
								<?= $exName ?>
							</a>
							<p>
								<?= $exDesc ?>
							</p>
						</li>
					<?php } ?>
				</ul>
			</nav>
		</e4p-chapter>
	<?php } ?>
</e4p-grid>

<script>
	$chaptersList = document.querySelectorAll('e4p-chapter ul')
	$chaptersList.forEach(function(list) {
		if (!list.children.length) {
			$chapter = list.closest('e4p-chapter');
			$chapter.style.display = 'none';
		}
	})
</script>