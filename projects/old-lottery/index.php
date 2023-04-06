<!doctype html>
<html lang='en' class='special-magic no-js <?=$pageData[' id']?>'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title>
			<?=$pageData['title']?>
		</title>
		<meta name="description" content="Adventureeee">
		<meta property="og:image" content="https://thumbs.dreamstime.com/b/woman-stands-crossroads-two-forest-roads-girl-choice-path-lost-woods-ways-to-achieve-goal-157422242.jpg">
		<link rel='stylesheet' href='styles/site.css'>
	</head>

	<body>
		<main class="page-content">
			<!-- dynamic page rending -->
			<section class="page-section <?=$module?>">
				<inner-column>
					<lottery-module>
						<ul>
							<?php
			for ($i=1; $i <= 50; $i++) {
				?>
							<li>
								<input type="checkbox" id="dial-<?=$i?>" class="dials" value="<?=$i?>">
								<label for="dial-<?=$i?>"><span>
										<?=$i?></span></label>
							</li>
							<?php }	?>
						</ul>
						<nav class="buttons">
							<button class="roll attention-voice button outline">Roll</button>
							<button class="submit attention-voice button contained">Submit</button>
						</nav>
					</lottery-module>
					<script>
					var dials = document.querySelectorAll('.dials')
					var checked = document.querySelectorAll('.dials:checked')
					var rollButton = document.querySelector('.roll');
					var submitButton = document.querySelector('.submit');
					const count = 5;
					const winningNumbers = getRndIntArr(1, 50);
					dials.forEach(dial => {
						dial.addEventListener('click', selectionLimit);
					});
					submitButton.addEventListener('click', submit);
					rollButton.addEventListener('click', roll);

					function selectionLimit() {
						var checked = document.querySelectorAll('.dials:checked')
						if (checked.length > count) {
							alert('Only select ' + count);
							checked[checked.length - 1].checked = false;
						}
					}

					function submit() {
						selectionLimit()
						var checked = document.querySelectorAll('.dials:checked')
						var values = [];
						checked.forEach((dial) => {
							values.push(dial.value);
						})
						checkWinner(values);
					}

					function resetDials() {
						dials.forEach((dial) => {
							dial.checked = false;
						})
					}

					function getRndIntArr(min, max) {
						numbers = [];
						for (var i = 0; i < count; i++) {
							numbers.push(Math.floor(Math.random() * (max - min + 1)) + min)
						}
						return numbers;
					}
					// rollButton
					function roll() {
						resetDials();
						var winnerArr = getRndIntArr(1, 50);
						for (var i = 0; i < winnerArr.length; i++) {
							dial = '#dial-' + winnerArr[i];
							var dialElement = document.querySelector(dial);
							dialElement.checked = true;
						}
					}

					function checkWinner(userNumbers) {
						winningNumbers.join('-')
						if (userNumbers == winningNumbers) {
							alert('winningNumbers are: ' + winningNumbers.join('-'))
							alert('You won!');
						} else {
							alert('winningNumbers are: ' + winningNumbers.join('-'))
							alert('You lost');
						}
					}
					</script>
				</inner-column>
			</section>
		</main>
</body>

</html>