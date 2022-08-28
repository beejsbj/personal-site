
		<layout-module class="layout3">
			<layout-header>
				<h1 class="teaser-voice">Little teaser</h1>
				<h2 class="loud-voice"> Heading level 2 small </h2>
				<p class="intro-voice"> This is some body text. This is some body text. This is some body text. This is some body text. This is some body fellow. This is some body text. </p>
			</layout-header>
			<ul class="card-list">
				<?php foreach ([1, 2, 3] as $key){ ?>
				<li>
					<?php include('templates/modules/layout3/layout3-card.php'); ?>
				</li>
				<?php } ?>
			</ul>
			</special-block>
		</layout-module>
