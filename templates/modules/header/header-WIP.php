<header>
<?php
	$headerJson = file_get_contents("data/modules/header.json");
	$headerData = json_decode($headerJson, true);
	$sections = $headerData;
	$sectionHeading = $pageData['heading'];
	foreach ($sections as $section) {
		$module = $section['module'] ?? "generic-text";
?>
	<section class="header-section <?=$module?>">
		<inner-column>
			<?php include("templates/modules/$module/$module.php"); ?>
		</inner-column>
	</section>
<?php } ?>




	<svg class="circle" viewBox="0 0 100 100">
	  <circle cx="50" cy="50" r="40" />
	</svg>

	

	
</header>