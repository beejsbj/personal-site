<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the E4P module";
	$exLink = $_GET['exercise'] ?? "saying-hello";
	$exName = unDasher($exLink);
?>

<h2 class="attention-voice">
	<?=$exName?>
</h2>
<?php 
	include("projects/e4p/$exLink.php");
?>

