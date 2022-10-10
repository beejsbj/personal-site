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
					<h1>
						<?php include 'roullete-title.php'; ?>
					</h1>
					<roullete-module>
						<numbers-grid>
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
									<input type="checkbox" id="first-half" class="halves" value="firsthalf">
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
									<input type="checkbox" id="red-check" class="halves" value="red">
									<label for="red-check">
										<span> red </span>
									</label>
								</li>
								<li>
									<input type="checkbox" id="blue-check" class="halves" value="blue">
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
									<input type="checkbox" id="second-half" class="halves" value="secondhalf">
									<label for="second-half">
										<span> 19-&nbsp36 </span>
									</label>
								</li>
							</ul>
							<ul class="chunks thirds-chunk">
								<li class="thirds">
									<input type="checkbox" id="first-12" value="first12">
									<label for="first-12">
										<span> First&nbspThird </span>
									</label>
								</li>
								<li class="thirds">
									<input type="checkbox" id="second-12" value="second12">
									<label for="second-12">
										<span> second&nbspThird </span>
									</label>
								</li>
								<li class="thirds">
									<input type="checkbox" id="third-12" value="third12">
									<label for="third-12">
										<span> third&nbspThird </span>
									</label>
								</li>
							</ul>
						</numbers-grid>
						<wheel-module>
							<?php include 'wheel.php'; ?>
							<button class="button" id="spin"> <?php include 'spin.php'; ?> </button>
						</wheel-module>
					</roullete-module>
				</inner-column>
			</section>
		</main>
		<script src="scripts/wheel.js"></script>
	</body>

</html>