
<?php 
// if heading exists condition
	$sectionHeading = $sectionHeading ?? ($section['heading'] ?? "This is the Generic text module");
	$headingClass = $section['heading-class'] ?? "attention-voice";
	$paragraphs = $section['paragraphs'] ?? ["this is the generic text paragraph" => "hide"];
?>
<text-content>
	<h2 class="<?=$headingClass?>">
		<?=$sectionHeading?>
	</h2>
<?php foreach ($paragraphs as $paragraph => $textVoice) { ?>
	<p class="<?=$textVoice?>">
		<?=$paragraph?>
	</p>
<?php } ?>
</text-content>