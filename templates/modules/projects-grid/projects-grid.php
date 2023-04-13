<?php
$sectionHeading = $section['heading'] ?? "This is the Projects module";
$projects = getProjects();
$currentPage = currentPage();


if ($currentPage != 'projects') {
	$projects = projectFilter($projects, 'feature');
}

if (isset($_GET['tags'])) {
	if ($_GET['tags'] == 'api3') {
		$projects = projectFilter($projects, 'api3');
	}
}

?>



<projects-grid>
	<?php
	foreach ($projects as $project) {
		$heading = $project['heading']  ?? "Project Title";
		$date = $project['date'] ?? "2022-06-13";
		$id = $project['id'] ?? "garden";
		$description = $project['description'] ?? "this is the Project Descripton";
		$image = $project['images'][$_SESSION['theme']]['thumbnail'] ?? $project['image'] ?? "landscape.jpg";


		// $url = $project['url'] ?? "projects/$id"; //pretty
		$url = $project['url'] ?? "?page=project&project=$id"; //ugly

		$tools = $project['tools'] ?? "['HTML', 'CSS']"; ?>

		<project-card>
			<h2 class="attention-voice heading">
				<?= $heading ?>
			</h2>
			<h3 class="teaser-voice date">
				<?= $date ?>
			</h3>
			<p class="calm-voice description">
				<?= $description ?>
			</p>
			<picture>
				<img src="images/<?= $image ?>" alt="">
			</picture>
			<ul class="tools">
				<?php
				foreach ($tools as $tool) {
					echo "<li><span>$tool</span></li>";
				}
				?>
			</ul>
			<a class="button" href="<?= $url ?>"><span>MORE</span></a>
		</project-card>
	<?php } ?>
</projects-grid>