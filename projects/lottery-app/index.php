<!doctype html>
<html lang='en' class='special-magic no-js?>'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title>Lottery</title>
		<meta name="description" content="Crypto lottery something something desc">
		<meta property="og:image" content="https://peprojects.dev/alpha-4/burooj/projects/lottery-app/meta.jpg">
		<link rel='stylesheet' href='styles/site.css'>
	</head>

	<body>
		<main class="page-content">
			<section class="page-section">
				<button class="button connect">
					<picture class="metamask-icon">
						<img src="metamask-bw.png" alt="">
					</picture> 
					<span>Connect</span>
				</button>
				<inner-column>
					<h1 class="loud-voice slide-in-top">Lottery. api3</h1>
					<lottery-module class='slide-in-right'>
						<ul>
							<?php for ($i=1; $i <= 50; $i++) { ?>
								<li>
									<input type="checkbox" id="dial-<?=$i?>" class="dials" value="<?=$i?>">
									<label for="dial-<?=$i?>">
										<span>
											<?=$i?>
										</span>
									</label>
								</li>
							<?php }	?>
						</ul>
						<nav class="buttons">
							<button class="roll attention-voice button">ROLL</button>
							<button class="submit attention-voice button contained">SUBMIT</button>
						</nav>
					</lottery-module>
					<bid-card class='slide-in-left'>
						
						<form class="bid-form" action="POST">
							<label class="teaser-voice" for="user-bid">make your bid</label>
							<input id="user-bid" type="number" min="1" placeholder="$$$" step="0.01">
						</form>
						<text-content>
							<h2 class="teaser-voice">current bid</h2>
							<output for="user-bid" id="current-bid" class="attention-voice heartbeat"></output>
						</text-content>
					</bid-card>
					<past-card class='slide-in-left'>
						<h2 class="teaser-voice">past winners</h2>
						<ol>
							<li class="attention-voice"> $335.334 </li>
							<li class="solid-voice"> $235.334 </li>
							<li class="solid-voice"> $335.334 </li>
						</ol>
					</past-card>
					<rules-card class='slide-in-left'>
						<h2 class="attention-voice">RULES</h2>
						<ol>
							<li> Select 5 numbers or ROLL if Lazy </li>
							<li> Make a bid </li>
							<li> Submit </li>
							<li> Wait for results </li>
							<li> Win or Lose </li>
						</ol>
					</rules-card>
					<div id="flipdown" class="flipdown"></div>
				</inner-column>
			</section>
		</main>
		<div class="final-result hide"></div>
		<script src="scripts/flipdown.js"></script>
		<script src="scripts/lottery.js">
		</script>
	</body>

</html>