<?php 
	$headerJson = file_get_contents("data/modules/header.json");
	$headerData = json_decode($headerJson, true);
	$components = $headerData['components'];
	$siteMenu = $components['site-menu'];

?>

<nav class="site-menu">
	<ul>
		<?php
			foreach ($siteMenu as $site) { 	
				echo "<li><a href='?page=$site'>$site</a></li>";
			} 
		?>
	</ul>
</nav>