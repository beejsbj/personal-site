<text-content>
	<?php
	$textContents = $components['text-content'];

	foreach ($textContents as $textContent) {
		$element = $textContent['element'];
		$content = $textContent['content'];
		$classes = implode(" ", $textContent['classes']); 
		?>

		<<?=$element?> class="<?=$classes?>">
			<?=$content?>
		</<?=$element?>>

	<?php } ?>
</text-content>