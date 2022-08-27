<?php 
	$introPara = $section['intro-paragraph'] ?? "This is the intro Paragraph";
	$items = $section['items'] ?? [1, 2, 3];

 ?>

<p>
	<?=$introPara?>
</p>

<projects-grid>
	<?php 

	 	foreach ($items as $project) {
	 		$title = $project['title']  ?? "Project Title";
	 		$description = $project['description'] ?? "this is the Project Descripton";
	 		$image = $project['image'] ?? "square.jpg"; ?>
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
				<a href="projects/<?=dasher($title)?>">LINK</a>
			</project-card>
	 	<?php } ?>
</projects-grid>