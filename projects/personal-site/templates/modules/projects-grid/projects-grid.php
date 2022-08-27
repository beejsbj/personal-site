<?php 
	$introPara = $section['intro-paragraph'];
	$items = $section['items'];

 ?>

<p>
	<?=$introPara?>
</p>

<projects-grid>
	<?php 

	 	foreach ($items as $project) {
	 		$title = $project['title'];
	 		$description = $project['description'];
	 		$image = $project['image']; ?>
	 		<project-card>
				<h1>
					<?=$title?>
				</h1>
				<p>
					<?=$description?>
				</p>
				<picture>
					<img src="images/<?=$image?>" alt="">
				</picture>
			</project-card>
	 	<?php } ?>
</projects-grid>