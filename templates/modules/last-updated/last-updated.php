<?php
$filepath = $section['filepath'] ?? "templates/modules/last-updated/last-updated.php";
?>


<style>
	section:has(+ .last-updated) inner-column {
		padding-bottom: 0;
	}

	.last-updated inner-column {
		padding-block: 0;
	}
</style>
<last-updated>
	<p class="whisper-voice">
		<em>Last updated: <?= date("F d, Y", filemtime($filepath)) ?></em>
	</p>
</last-updated>