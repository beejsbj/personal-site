<?php 
	$buttons = $components['buttons'];
?>

<nav class="buttons">
	<ul>
		<?php
			foreach ($buttons as $button) {
				$name = $button['name'];
				$type = $button['type'];
				$classes = implode(' ', $button['classes']);

				include("templates/components/$type/$type.php");
			}
		?>
	</ul>
</nav>



