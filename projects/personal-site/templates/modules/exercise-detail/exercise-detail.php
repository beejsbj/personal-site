<?php 
// if heading exists condition
	$sectionHeading = $section['heading'] ?? "This is the E4P module";
	$exName = $_GET['exercise'] ?? "saying-hello";
?>

<h2 class="attention-voice">
	<?=$exName?>
</h2>
<?php 
	include("projects/exercises/$exName.php");
?>

