<section class="page-section layout1">
	<inner-column>
		<layout-module>
			<layout-header>
				<h2 class="attention-voice"> Heading level 2 small </h2>
				<p class="calm-voice"> This is some body text. This is some body text. This is some body text. This is some body text. This is some body fellow. This is some body text. </p>
			</layout-header>
			<ul class="card-list">
				<?php foreach ([1, 2, 3, 4, 5, 6] as $key): ?>
					<li>
					<?php include('modules/layout1/layout1-card.php'); ?>
				</li>
				<?php endforeach ?>
			</ul>
			<ul class="image-grid">
				<?php foreach ([1, 2, 3, 4] as $key): ?>
					<li>
						<picture>
							<img src="images/square.jpg" alt="">
						</picture>
					</li>
				<?php endforeach ?>
			</ul>
		</layout-module>
	</inner-column>
</section>