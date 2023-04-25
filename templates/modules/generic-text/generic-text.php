<?php

$sectionHeading = $section['heading'] ?? $sectionHeading ?? "this is the generic text heading";
$headingClass = $section['heading-class'] ??  $headingClass ?? "attention-voice";
$paragraphsClass = $section['paragraphsClass'] ?? "hide";
$paragraphs = $section['paragraphs'] ?? [["text" => "this is the first paragraph"], ["text" => "this is the second paragraph"]];

?>
<text-content>
	<h2 class="<?= $headingClass ?>">
		<?= $sectionHeading ?>
	</h2>



	<?php foreach ($paragraphs as $paragraph) {
		$textVoice =   $paragraph['voice'] ?? $paragraphsClass ?? "hide";
		$paragraph = is_array($paragraph) ?  $paragraph['text'] : $paragraph;
	?>

		<p class="<?= $textVoice ?>">
			<?= $paragraph ?>
		</p>

	<?php } ?>

</text-content>