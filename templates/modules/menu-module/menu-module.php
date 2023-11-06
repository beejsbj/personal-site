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

			$class = $menuItem['class'] ?? "text";
			$slug = $menuItem['slug'];
			$name = $menuItem['name'];
			$target = $menuItem['target'] ?? NULL;



			if ($menu == 'site') {
				$class = "$class " . activePage($menuItem['activePage'] ?? false);
				// $slug = $menuItem['slug']; //pretty
				$slug = "?page=" . $menuItem['slug']; //ugly

			}
			if ($menu == 'theme') {
				$class = "$class " . activeTheme($menuItem['activePage']);
				// $slug = currentPage() . "?theme=" . $menuItem['slug']; //pretty
				$slug = "?theme=" . $menuItem['slug'] . "&page=" . currentPage(); //ugly

			}
			if ($menu == 'garden') {
				$class = "$class " . activePage($menuItem['activePage'] ?? false);
				// $slug = $menuItem['slug']; //pretty
				$slug =  $menuItem['slug']; //ugly

			}
		?>
			<li>
				<a class="<?= $class ?> " href="<?= $slug ?>" target="<?= $target ?>">
					<span><?= $name ?></span>
					<picture class="external-link <?= $target == NULL ? 'hide' : '' ?>">
						<img src="images/diagonal-arrow.svg" alt="">
					</picture>
				</a>
			</li>
		<?php } ?>
	</ul>
</nav>