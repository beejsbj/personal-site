<?php
	$detailsContent = $components['details-content'];
?>





<details-content>
	<?php
		foreach ($detailsContent as $detail) {
			$summary = $detail['summary'];
			$detailParagraph = $detail['detail-paragraph'];
			?>
	
	<details>
		<summary class="notice-voice">
			<?=$summary?>				
		</summary>
		<p class="calm-voice">
			<?=$detailParagraph?>
		</p>
	</details>
	<?php	} ?>
</details-content>