<?php 
	$sectionHeading = $section['heading'] ?? "This is the Projects module";
	$introPara = $section['intro-paragraph'] ?? "This is the intro Paragraph";
	$projects = getPageData('projects-list');

	$currentPage = currentPage();


	if ($currentPage != 'projects') {
		$filtered = [];

		foreach ($projects as $project) {
			if ( isset($project['feature'])) {
				array_push($filtered, $project);
			}
		}
		$projects = $filtered;
	}
	
 ?>

<p class="notice-voice">
	<?=$introPara?>
</p>

<projects-grid>
	<?php 
	 	foreach ($projects as $project) {
	 		$title = $project['title']  ?? "Project Title";
	 		$description = $project['description'] ?? "this is the Project Descripton";
	 		$image = $project['image'] ?? "square.jpg"; 
	 		$url = $project['url'] ?? "?page=layout-garden"; ?>

	 		<project-card>
				<h1 class="attention-voice">
					<?=$title?>
				</h1>
				<p class="whisper-voice">
					<?=$description?>
				</p>
				<picture>
					<img src="images/<?=$image?>" alt="">
				</picture>
				<a href="<?=$url?>">LINK</a>
			</project-card>
 	<?php } ?>
</projects-grid>