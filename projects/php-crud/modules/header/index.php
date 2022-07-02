<section class="nav-bar">
	<inner-column>
		<nav class="site-menu">
			//loop
			<a class="<?=activePage('home')?>" href="?page=home">Home</a>
			<a class="<?=activePage('list')?>" href="?page=list">Jolly Roger List</a>
			<?php 
				if ($_POST["password"] == $_SESSION['name']) { ?>
					<a class="<?=activePage('add')?>" href="?page=add">Add</a>
			<?php } ?>
			<a class="<?=activePage('login')?>" href="?page=login">login</a>
		</nav>
	</inner-column>
</section>

<section class="title-landing">
	<inner-column>
		<h1 class="loud-voice">
			<?=$pageName?>
		</h1>
	</inner-column>
</section>