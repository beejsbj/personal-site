<layout-module class="layout1">
	<layout-header>
		<h2 class="loud-voice"> Heading level 2 small </h2>
		<p class="intro-voice"> This is some body text. This is some body text. This is some body text. This is some body text. This is some body fellow. This is some body text. </p>
	</layout-header>
	<ul class="card-list">
		<?php foreach ([1, 2, 3, 4, 5, 6] as $key){ ?>
		<li>
			<?php include('templates/modules/layout1/layout1-card.php'); ?>
		</li>
		<?php } ?>
	</ul>
	<ul class="image-grid">
		<?php foreach ([1, 2, 3, 4] as $key){ ?>
		<li>
			<picture>
				<img src="images/square.jpg" alt="">
			</picture>
		</li>
		<?php } ?>
	</ul>
</layout-module>