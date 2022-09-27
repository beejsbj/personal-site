
		<layout-module class="layout2">
			<layout-header>
				<h1 class="teaser-voice">Little teaser</h1>
				<h2 class="loud-voice"> Heading level 2 small </h2>
				<p class="notice-voice"> This is some body text. This is some body text. This is some body text. This is some body text. This is some body fellow. This is some body text. </p>
			</layout-header>
			<ul class="card-list">
				<?php foreach ([1, 2, 3, 4] as $key){ ?>
				<li>
					<?php include('templates/modules/layout2/layout2-card.php'); ?>
				</li>
				<?php } ?>
			</ul>
			<special-block>
				<p class="calm-voice">
				This is some body text. This is some body fellow. This is some body text. This is some body text. This is some body text.
			</p>
			</special-block>
		</layout-module>
