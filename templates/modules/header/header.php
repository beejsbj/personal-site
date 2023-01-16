<?php
	$pageHeading = $pageData['heading'] ?? 'NA';
?>


<header>

	<svg class="circle" viewBox="0 0 100 100">
	  <circle cx="50" cy="50" r="40" />
	</svg> 

	<section class="header-section menus">
		<inner-column>
			<?php 
				$menu = "site";
				include('templates/modules/menu-module/menu-module.php');
				$menu = "theme";
				include('templates/modules/menu-module/menu-module.php');  
			?>
		</inner-column>
	</section>

	<section class="header-section">
		<inner-column>
			<h1 class="booming-voice">
				<?=$pageHeading?>
			</h1>
	</inner-column>
	</section>
</header>