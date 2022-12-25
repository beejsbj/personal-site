<?php 
	$sectionHeading = $section['heading'] ?? "This is the Projects module";
	$projects = getProjects();
	

	$currentPage = currentPage();


	if ($currentPage != 'projects') {
		$projects = projectFilter($projects, 'feature');
	}

	if ( isset($_GET['tags']) ) {
		if ($_GET['tags'] == 'api3') {
			$projects = projectFilter($projects, 'api3');
		}
	}
	
 ?>



<projects-grid>
	<?php 
	 	foreach ($projects as $project) {
	 		$heading = $project['heading']  ?? "Project Title";
	 		$id = $project['id'] ?? "garden";
	 		$description = $project['description'] ?? "this is the Project Descripton";
	 		$image = $project['image'] ?? "square.jpg"; 
	 		$url = $project['url'] ?? "?page=layout-garden";
	 		$tools = $project['tools'] ?? "['HTML', 'CSS']"; ?>

	 		<project-card>
				<h1 class="attention-voice">
					<?=$heading?>
				</h1>
				<p class="whisper-voice">
					<?=$description?>
				</p>
				<picture>
					<img src="images/<?=$image?>" alt="">
				</picture>
				<ul class="tools">
					<?php
						foreach ($tools as $tool) {
							echo "<li><span>$tool</span></li>";
						}
					?>
				</ul>
				<a class="button" href="?page=project&project=<?=$id?>"><span>MORE</span></a>
			</project-card>
 	<?php } ?>
</projects-grid>