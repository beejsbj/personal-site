<?php
$pageHeading = $pageData['heading'] ?? 'NA';
?>


<header>
	<section class="header-section menus">
		<inner-column>
			<mast-head>

				<?php
				$menu = "theme";
				include('templates/modules/menu-module/menu-module.php');


				$menu = "site";
				include('templates/modules/menu-module/menu-module.php');

				?>


			</mast-head>
		</inner-column>
	</section>
</header>


<script>

</script>