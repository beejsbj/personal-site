<?php



$inputs = [
	[
		'label' => 'Text',
		'type' => 'text',
	],
	[
		'label' => 'Textarea',
		'type' => 'textarea',
	],
	// [
	// 	'label' => 'Single Select',
	// 	'type' => 'single',
	// 	'isMultiselect' => true,
	// ],
	// [
	// 	'label' => 'Multi Select',
	// 	'type' => 'tags',
	// 	'isMultiselect' => true,
	// ],
	[
		'label' => 'Checkbox',
		'type' => 'checkbox',
		'options' => ['checkbox1', 'checkbox2', 'checkbox3'],
	],
	[
		'label' => 'Radio',
		'type' => 'radio',
		'options' => ['option1', 'option2', 'option3'],
	]
];

?>


<form-guide>
	<text-content>
		<h2 class="attention-voice">Form Guide</h2>
		<p>
			These are the form elements used in the app.
		</p>
	</text-content>


	<ul>
		<?php foreach ($inputs as $input) { ?>
			<li>

				<!-- text input -->
				<?php if ($input['type'] == 'text') { ?>
					<form-field class="input-field">
						<label class="firm-voice" for="text">Text</label>
						<input type="text" id="text" placeholder="This is a text input" />
					</form-field>
				<?php } ?>

				<!-- textarea input -->
				<?php if ($input['type'] == 'textarea') { ?>
					<form-field class="input-field">
						<label class="firm-voice" for="textarea">Textarea</label>
						<textarea id="textarea" placeholder="This is a text area" rows="4"></textarea>
					</form-field>
				<?php } ?>

				<!-- single select input -->
				<?php if ($input['type'] == 'single') { ?>
					<form-field class="input-field">
						<label class="firm-voice" for="single">Single Select</label>
						<select id="single">
							<option value="option1">Option 1</option>
							<option value="option2">Option 2</option>
							<option value="option3">Option 3</option>
						</select>
					</form-field>
				<?php } ?>

				<!-- multi select input -->
				<?php if ($input['type'] == 'tags') { ?>
					<form-field class="input-field">
						<label class="firm-voice" for="tags">Multi Select</label>
						<select id="tags" multiple>
							<option value="option1">Option 1</option>
							<option value="option2">Option 2</option>
							<option value="option3">Option 3</option>
						</select>
					</form-field>

				<?php } ?>

				<!-- checkbox input -->

				<?php if ($input['type'] == 'checkbox') { ?>
					<h3 class="firm-voice">Checkbox</h3>
					<form-field class="radio-list">
						<?php foreach ($input['options'] as $option) { ?>
							<div class="input-field">
								<input id="<?= $option ?>" type="checkbox" name="checkbox-demo" value="<?= $option ?>">
								<label for="<?= $option ?>"><?= $option ?></label>
							</div>
						<?php } ?>
					</form-field>
				<?php } ?>

				<!-- radio input -->
				<?php if ($input['type'] == 'radio') { ?>
					<h3 class="firm-voice">Radio</h3>
					<form-field class="radio-list">
						<?php foreach ($input['options'] as $option) { ?>
							<div class="input-field">
								<input id="<?= $option ?>" type="radio" name="radio-demo" value="<?= $option ?>">
								<label for="<?= $option ?>"><?= $option ?></label>
							</div>
						<?php } ?>
					</form-field>
				<?php } ?>

			</li>
		<?php } ?>
	</ul>
</form-guide>

<style>
	form-guide {
		display: grid;
		gap: var(--space-xl);
	}

	form-guide ul {
		display: grid;
		gap: var(--space-xl);
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}

	form-guide ul li {
		display: grid;
		gap: var(--space-s);
	}
</style>