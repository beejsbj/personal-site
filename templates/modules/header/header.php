<?php
$pageHeading = $pageData['heading'] ?? 'NA';
?>


<header>

	<div class="overflow-hidden">
		<?php include('images/circle.svg'); ?>
	</div>

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


</header>


<script>

</script>