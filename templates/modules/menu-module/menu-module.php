
<?php
	$menu = $section['menu'] ?? $menu ?? 'test'; 

	if (file_exists("data/components/$menu-menu.json")){
		$menuJson = file_get_contents("data/components/$menu-menu.json");
		$menuData = json_decode($menuJson, true);
	} else {
		$menuData = $section['links'];
	}
	
	 
?>

<nav class="<?=$menu?>-menu">
	<ul>
		<?php foreach ($menuData as $menuItem) {
			$class = $menuItem['class'] ?? ""; 
			$slug = $menuItem['slug']; 
			$name = $menuItem['name'];
			$target = $menuItem['target'] ?? "";
			if ($menu == 'site') {
				$class = activePage($menuItem['class']);
				$slug = $menuItem['slug'] . "/?theme=" . currentTheme(); //pretty
				$slug = "?page=" . $menuItem['slug'] . "&theme=" . currentTheme(); //ugly

			}
			if ($menu == 'theme') {
				$class = activeTheme($menuItem['class']);
				$slug = currentPage() . "/?theme=" . $menuItem['slug']; //pretty
				$slug = "?theme=" . $menuItem['slug'] . "&page=" . currentPage(); //ugly

			}
			?>
			<li>
				<a 
					class="<?=$class?>" 
					href="<?=$slug?>"
					target="<?=$target?>"
				>
					<span><?=$name?></span>
				</a>
			</li>
		<?php } ?>
	</ul>
</nav>
