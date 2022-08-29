<?php 
// if heading exists condition
	$exLink = $_GET['exercise'] ?? "saying-hello";
	$sectionHeading = unDasher($exLink) ?? "This is an exercise";
?>

<h2 class="loud-voice">
	<?=$sectionHeading?>
</h2>
<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
<?php 
	include("projects/e4p/$exLink.php");
?>

