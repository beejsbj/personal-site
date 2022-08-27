

<contact-list>
	<h2 class="attention-voice">
	<?=$sectionHeading?>
</h2>
	<nav>
		<ul>
			
			<?php
			$contacts = $section['contacts'] ?? [1, 2, 3]; 
			foreach ($contacts as $contact) { 
				$name = $contact['name'] ?? "Contact name";
				$link = $contact['link'] ?? "#";
				?>
				<li><a href="<?=$link?>"><?=$name?></a></li>
			<?php } ?>
		</ul>
	</nav>
</contact-list>