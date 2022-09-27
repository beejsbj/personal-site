
		<layout-module class="layout4">
			<layout-header class="div1">
				<h1 class="teaser-voice">Little teaser</h1>
				<h2 class="loud-voice"> Heading level 2 small </h2>
				<p class="intro-voice"> This is some body text. This is some body text. This is some body text. This is some body text. This is some body fellow. This is some body text. </p>
			</layout-header>
				<detail-section>
				<h1 class="teaser-voice">Little teaser</h1>
				<ul class="card-list">
				<?php foreach ([1, 2, 3] as $key){ ?>
				<li>
					<?php include('templates/modules/layout4/layout4-card.php'); ?>
				</li>
				<?php } ?>
			</ul>
			</detail-section>
			<detail-section>
				<h1 class="teaser-voice">Little teaser</h1>
				<ul class="card-list">
				<?php foreach ([1, 2, 3, 4, 5, 6, 7, 8] as $key){ ?>
				<li>
					<?php include('templates/modules/layout4/layout4-card.php'); ?>
				</li>
				<?php } ?>
			</ul>
			</detail-section>
		</layout-module>
