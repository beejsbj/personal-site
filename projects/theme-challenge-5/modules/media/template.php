

<media-item>
	<header>
		<picture>
			<img src="https://yourlocalcannabis.com/wp-content/uploads/2020/11/YLC-Icon-Dark-Green-copy-1.png" alt="">
		</picture>
		<h2 class='attention-voice'>Your Local Cannabis Media
		</h2>

		<p>What buds are causing the biggest buzz in the GTA? Check out the Starbuds of the week and delve into our neighbours’ choices.</p>
	</header>

	<article-grid>
		<ul class='article-list'>

			<?php foreach ($media as $article) { ?>
				<li class='article'>
					<?php include('modules/article-card/template.php'); ?>
				</li>
			<?php } ?>

		</ul>
	</article-grid>
</media-item>

