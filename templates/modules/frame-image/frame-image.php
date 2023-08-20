<?php
$image = "images/projects/" . $section['image'] ?? "images/" . $pageData['image'] ?? 'images/landscape.jpg';
$device =  $section['device'] ?? "laptop";
?>


<frame-image>
	<picture class="<?= "$device-frame" ?>">
		<img src="images/<?= "$device-frame.svg" ?>">
		<video src="<?= "$image" ?>" autoplay loop></video>
	</picture>
</frame-image>