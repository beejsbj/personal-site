<?php


$video = isset($section['video']) ? "images/projects/" . $section['video'] : "images/" . $pageData['video'] ?? 'images/landscape.jpg';

$image = isset($section['image']) ? "images/projects/" . $section['image'] : "images/" . $pageData['image'] ?? 'images/landscape.jpg';

$device =  $section['device'] ?? "laptop";
?>


<frame-image class="<?= $device ?>">
	<picture class="<?= "$device-frame" ?>">

		<?php if (isset($section['video'])) { ?>
			<video src="<?= "$video" ?>" autoplay loop></video>

		<?php } ?>
	</picture>
</frame-image>