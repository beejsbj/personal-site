<footer>
	<?php // include('images/circle.svg'); 
	?>

	<inner-column>

		<ul class="footer-menus">
			<li>
				<h3 class="solid-voice">
					Pages
				</h3>
				<?php
				$menu = "site";
				include('templates/modules/menu-module/menu-module.php');
				?>
			</li>
			<li>
				<h3 class="solid-voice">
					Themes
				</h3>
				<?php
				$menu = "theme";
				include('templates/modules/menu-module/menu-module.php');
				?>
			</li>
		</ul>



	</inner-column>
</footer>