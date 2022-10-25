<?php 
	$sectionHeading = $section['heading'] ?? "This is the Projects module";
	$introPara = $section['intro-paragraph'] ?? "This is the intro Paragraph";
	$projects = getPageData('projects-list');
	

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

<p class="notice-voice">
	<?=$introPara?>
</p>

<projects-grid>
	<?php 
	 	foreach ($projects as $project) {
	 		$title = $project['title']  ?? "Project Title";
	 		$description = $project['description'] ?? "this is the Project Descripton";
	 		$image = $project['image'] ?? "square.jpg"; 
	 		$url = $project['url'] ?? "?page=layout-garden";
	 		$tools = $project['tools'] ?? "['HTML', 'CSS']"; ?>

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
				<ul class="tools">
					<?php
						foreach ($tools as $tool) {
							echo "<li>$tool</li>";
						}
					?>
				</ul>
				<a class="button" href="<?=$url?>"><span>LINK</span></a>
			</project-card>
 	<?php } ?>
</projects-grid>