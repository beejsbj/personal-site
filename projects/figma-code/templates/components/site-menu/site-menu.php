<?php 

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