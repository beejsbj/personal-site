

<contact-list>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
	<nav>
		<ul>
			
			<?php
			$contacts = $section['contacts']; 
			foreach ($contacts as $contact) { 
				$name = $contact['name'];
				$link = $contact['link'];
				?>
				<li><a href="<?=$link?>"><?=$name?></a></li>
			<?php } ?>
		</ul>
	</nav>
</contact-list>