<?php 
	$leftIcon = $button['left-icon'] ?? false;
	$rightIcon = $button['right-icon'] ?? false;
?>

<a href="?page=<?=$name?>" class="button <?=$classes?>">
	<?php 
		if ($leftIcon) {
			echo "<picture><img src='images/$leftIcon' alt=''></picture>";
		}
	?>
	<span><?=$name?></span>
	<?php 
		if ($rightIcon) {
			echo "<picture><img src='images/$rightIcon' alt=''></picture>";
		}
	?>
</a>

