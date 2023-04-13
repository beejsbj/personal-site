<?php
$pageHeading = $pageData['heading'] ?? 'NA';
?>


<header>

	<?php include('images/circle.svg'); ?>

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

	<section class="header-section page-title">
		<inner-column>
			<h1 class="booming-voice">
				<?= $pageHeading ?>
			</h1>
		</inner-column>
	</section>
</header>


<script>

</script>