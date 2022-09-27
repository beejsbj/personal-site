<?php 
// if heading exists condition
	$exLink = $_GET['exercise'] ?? "saying-hello";
	$exerciseName = unDasher($_GET['exercise']);
?>
<exercise-detail>
	<a href="?page=e4p">BACK</a>
	<h2 class="loud-voice">
		<?=$exerciseName?>
	</h2>
	<?php 
	include("projects/e4p/$exLink.php");
?>
</exercise-detail>