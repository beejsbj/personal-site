
<?php
	$themeJson = file_get_contents("data/components/theme-menu.json");
	$themeData = json_decode($themeJson, true);	
?>


<nav class="theme-menu">
	<ul>
		<li class="hover-hide">
			<a href='old'>Old</a>
		</li>
		<?php if (count($themeData) > 1) {
				foreach ($themeData as $theme) { ?>
					<li>
						<a href='?page=<?=currentPage()?>&theme=<?=$theme['slug']?>'><?=$theme['name']?></a>
					</li>
		<?php }} ?>
	</ul>
</nav>



