<?php
$menu = $section['menu'] ?? $menu ?? 'test';
$class = $menu == 'site' || $menu == 'theme' ? "magnetic $menu" : $menu;



if (file_exists("data/components/$menu-menu.json")) {



	$menuJson = file_get_contents("data/components/$menu-menu.json");

	$menuData = json_decode($menuJson, true);
} else {
	$menuData = $section['links'];
}
?>

<nav class="<?= $class ?>-menu">
	<ul>

		<?php foreach ($menuData as $menuItem) {

			$slug = $menuItem['slug'];
			$name = $menuItem['name'];
			$target = $menuItem['target'] ?? NULL;
			$class = $menuItem['class'] ?? "text";

			if ($target != NULL) {
				$class = $class . ' external-link';
			}


			if ($menu == 'site') {

				if (!$currentTheme) {
					$class = "$class " . activeTheme($menuItem['activePage']);
					$slug = "?theme=" . $menuItem['slug'] . "&page=" . currentPage();
				} else {
					$class = "$class " . activePage($menuItem['activePage'] ?? false);
					$slug = "?page=" . $menuItem['slug'];
				}
			}
			if ($menu == 'theme') {
				$class = "$class " . activeTheme($menuItem['activePage']);
				$slug = "?theme=" . $menuItem['slug'] . "&page=" . currentPage();
			}
			if ($menu == 'garden') {
				$class = "$class " . activePage($menuItem['activePage'] ?? false);
				$slug =  $menuItem['slug'];
			}
		?>
			<li>
				<a class="<?= $class ?> " href="<?= $slug ?>" target="<?= $target ?>" data-swup-animation="circle">
					<span><?= $name ?></span>
				</a>
			</li>
		<?php } ?>
	</ul>
</nav>