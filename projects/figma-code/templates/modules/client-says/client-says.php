<client-says>
	<?php include('templates/components/text-content/text-content.php'); ?>
	<review-grid>
		
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
							<h1><?=$name?></h1>
				<h2><?=$position?></h2>
		</avatar-card>
		<blockquote> “<?=$quote?>” </blockquote>
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
	</review-grid>
</client-says>		

