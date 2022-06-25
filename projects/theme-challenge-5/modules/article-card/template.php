
<?php
	$heading = $article['heading'];
	$description = $article['description'];
	$thumbnail = $article['thumbnail'];
?>

<a href="#">
<article class='article-card'>
	
		<picture>
			<img class="blend" src='images/<?=$thumbnail?>' alt='$todo'>
		</picture>
	
	

	<text-content>
		<picture>
		<img src="https://yourlocalcannabis.com/wp-content/uploads/2020/12/Stars-copy.png" alt="">
	</picture>
		<h1 class='title strong-voice'><?=$heading?></h1>

		<p class='teaser'><?=$description?></p>

		
	</text-content>
</article>
</a>
