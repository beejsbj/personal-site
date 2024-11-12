<?php

$sectionHeading = $section['heading'] ?? $sectionHeading ?? "this is the generic text heading";
$headingClass = $section['heading-class'] ??  $headingClass ?? "attention-voice";
$paragraphsClass = $section['paragraphsClass'] ?? "hide";
$paragraphs = $section['paragraphs'] ?? ["this is the first paragraph", "this is the second paragraph"];

?>
<text-content class="generic-list">
	<h2 class="<?= $headingClass ?>">
		<?= $sectionHeading ?>
	</h2>


	<ul>
		<?php foreach ($paragraphs as $paragraph) {
			$textVoice =  $paragraphsClass;
		?>

			<li>
				<?= $paragraph ?>
			</li>

		<?php } ?>
	</ul>

</text-content>