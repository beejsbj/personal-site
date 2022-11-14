
<?php
	$menu = $section['menu'] ?? $menu ?? 'test'; 

	$menuJson = file_get_contents("data/components/$menu-menu.json");
	$menuData = json_decode($menuJson, true);
	 
?>

<nav class="<?=$menu?>-menu">
	<ul>
		<?php foreach ($menuData as $menuItem) {
			$class = $menuItem['class'] ?? ""; 
			$slug = $menuItem['slug']; 
			if ($menu == 'site') {
				$class = activePage($menuItem['class']);
				$slug = $menuItem['slug'] . "&theme=" . currentTheme();
			}
			if ($menu == 'theme') {
				$class = activeTheme($menuItem['class']);
				$slug = "?page=" . currentPage() . $menuItem['slug'];
			}
			?>
			<li>
				<a 
					class="<?=$class?>" 
					href="<?=$slug?>"
				>
					<span><?=$menuItem['name']?></span>
				</a>
			</li>
		<?php } ?>
	</ul>
</nav>