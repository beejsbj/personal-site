<?php
$tag = $section['tag'] ?? null;

// Usage
$substack_url = 'https://buroojs.substack.com'; // Replace with your Substack URL
$articles = get_substack_articles($substack_url, 9, $tag);
?>

<ul>
	<?php if (!empty($articles)) : ?>
		<?php foreach ($articles as $article) : ?>
			<li>
				<a href="<?php echo $article['link']; ?>" target="_blank">
					<?php if ($article['image']) : ?>
						<picture>
							<img src="<?php echo $article['image']; ?>" alt="<?php echo $article['title']; ?>">
						</picture>
					<?php endif; ?>

					<div class="article-content">
						<h3 class="solid-voice">
							<?php echo $article['title']; ?>
						</h3>
						<p class="whisper-voice">
							<?php echo $article['date']; ?>
						</p>
						<p>
							<?php echo $article['description']; ?>
						</p>
					</div>
				</a>
			</li>
		<?php endforeach; ?>
	<?php else : ?>
		<p>No articles found.</p>
	<?php endif; ?>
</ul>