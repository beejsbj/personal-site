<!doctype html>
<html lang='en' class='special-magic no-js?>'>

	<head>
		<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<title>Roulette</title>
		<meta name="description" content="Crypto Roulette something something desc">
		<meta property="og:image" content="https://peprojects.dev/alpha-4/burooj/projects/roulette-app/images/meta.jpg">
		<link rel='stylesheet' href='styles/site.css'>
	</head>

	<body>
		<main class="page-content">
			<section class="page-section">
				<button class="button connect">
					<span>CONNECT</span>
					<picture class="metamask-icon">
						<img src="images/metamask-bw.png" alt="">
					</picture>
					
				</button>
				<inner-column>
					<h1 class="attention-voice flicker-in-2">
						<?php //include 'roullete-title.php'; ?>
						<span>R</span>
						<span>O</span>
						<span>U</span>
						<span>L</span>
						<span>E</span>
						<span>T</span>
						<span>T</span>
						<span>E</span>
					</h1>
					<roullete-module>
						<numbers-grid>
							<zero-number>
									<input type="checkbox" id="num-0" class="num" value="0">
									<label for="num-0">
										<span> Z E R 0 </span>
									</label>
								</zero-number>
							<ul class="numbers">
								<?php for ($i=1; $i <= 36; $i++) { ?>
								<li>
									<input type="checkbox" id="num-<?=$i?>" class="num" value="<?=$i?>">
									<label for="num-<?=$i?>">
										<span>
											<?=$i?>
										</span>
									</label>
								</li>
								<?php }	?>
							</ul>
							<ul class="chunks halves-chunk">
								<li>
									<input type="checkbox" id="first-half" class="halves" value="first18">
									<label for="first-half">
										<span> 1-&nbsp18 </span>
									</label>
								</li>
								<li>
									<input type="checkbox" id="even" class="halves" value="even">
									<label for="even">
										<span> even </span>
									</label>
								</li>
								<li>
									<input type="checkbox" id="red-check" class="halves color" value="red">
									<label for="red-check">
										<span> red </span>
									</label>
								</li>
								<li>
									<input type="checkbox" id="blue-check" class="halves color" value="blue">
									<label for="blue-check">
										<span> blue </span>
									</label>
								</li>
								<li>
									<input type="checkbox" id="odd" class="halves" value="odd">
									<label for="odd">
										<span> odd </span>
									</label>
								</li>
								<li>
									<input type="checkbox" id="second-half" class="halves" value="second18">
									<label for="second-half">
										<span> 19-&nbsp36 </span>
									</label>
								</li>
							</ul>
							<ul class="chunks thirds-chunk">
								<li >
									<input class="thirds" type="checkbox" id="first-12" value="first12">
									<label for="first-12">
										<span> first&nbspthird </span>
									</label>
								</li>
								<li >
									<input class="thirds" type="checkbox" id="second-12" value="second12">
									<label for="second-12">
										<span> second&nbspthird </span>
									</label>
								</li>
								<li >
									<input class="thirds" type="checkbox" id="third-12" value="third12">
									<label for="third-12">
										<span> third&nbspthird </span>
									</label>
								</li>
							</ul>
						</numbers-grid>
						<wheel-module>
							<?php include 'modules/wheel.php'; ?>
							<button class="button" id="spin">
								<?php include 'modules/spin-button.php'; ?> 
								<div class="spin-text">
									<span>S</span>
									<span>P</span>
									<span>I</span>
									<span>N</span>
								</div>
								<div class="result hide">
									
								</div>
							</button>
						</wheel-module>
						<info-module>

							
							<?php include 'modules/choose-number.php'; ?>
							<?php include 'modules/results-box.php'; ?>

						</info-module>

					</roullete-module>
				</inner-column>
			</section>
		</main>
		<script src="scripts/wheel.js"></script>
	</body>

</html>