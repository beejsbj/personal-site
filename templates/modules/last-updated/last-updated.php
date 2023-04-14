<?php
$filepath = $section['filepath'] ?? "templates/modules/last-updated/last-updated.php";
?>

<last-updated>
	<p class="whisper-voice">
		<em>Last updated: <?= date("F d, Y", filemtime($filepath)) ?></em>
	</p>
</last-updated>