
<?php include ('data/articles.php'); ?>

<articles-intro>
	<header>
		<picture>
			<img src="https://yourlocalcannabis.com/wp-content/uploads/2020/11/YLC-Icon-Dark-Green-copy-1.png" alt="">
		</picture>
		<h2 class='attention-voice'>Shop Local Cannabis Favourites
		</h2>

		<p>Say high to our favourite deep roots and desirable flowers.</p>
		<p>Shop our wide range of dry flower, vaporizers, edibles and CBD products
online or in-person. We carry the most popular picks in the GTA.</p>
	</header>

	<article-grid>
		<ul class='article-list'>

			<?php foreach ($articles as $article) { ?>
				<li class='article'>
					<?php include('modules/article-card/template.php'); ?>
				</li>
			<?php } ?>

		</ul>
	</article-grid>
</articles-intro>
