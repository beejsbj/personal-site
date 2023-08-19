<?php

$image = "images/projects/" . $section['image'] ?? "images/" . $pageData['image'] ?? 'images/landscape.jpg';
$device = $section['device'] ?? "laptop";
$caption = $section['caption'] ?? "";

?>


<frame-image>
	<div>
		<picture class="<?= "$device-frame" ?>">
			<img src="images/<?= "$device-frame.svg" ?>" style="
			background-image: url('<?= $image ?>');
			">
		</picture>
	</div>
	<p class="whisper-voice caption">
		<?= $caption ?>
	</p>
</frame-image>