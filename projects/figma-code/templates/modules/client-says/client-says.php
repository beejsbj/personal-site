<client-says>
	<?php include('templates/components/text-content/text-content.php'); ?>
	<review-grid>
		<picture>
			<?php include('images/arrow-icon.php'); ?>
		</picture>
		<?php 
		$reviewCards = $components['review-card'];

		foreach ($reviewCards as $reviewCard) {
			$name = $reviewCard['name'];
			$position = $reviewCard['position'];
			$avatar = $reviewCard['avatar'];
			$quote = $reviewCard['quote'];
			$avatar = $reviewCard['avatar'];
			$image = $reviewCard['image'];
			$rating = $reviewCard['rating'];
			?>
		<review-card>
			<avatar-card>
				<picture>
					<img src="images/<?=$avatar?>" alt="">
				</picture>
				<h1 class="solid-voice">
					<?=$name?>
				</h1>
				<h2 class="whisper-voice">
					<?=$position?>
				</h2>
			</avatar-card>
			<blockquote class="calm-voice"> “
				<?=$quote?>” </blockquote>
			<star-rating>
				<?php 
				for ($i=0; $i < $rating ; $i++) { 
					echo "<picture>";
					include('images/star.php');
					echo "</picture>";

				} 
			?>
			</star-rating>
		</review-card>
		<?php } ?>
		<picture>
			<?php include('images/arrow-icon.php'); ?>
		</picture>
	</review-grid>
</client-says>