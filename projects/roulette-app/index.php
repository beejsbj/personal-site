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
					<wheel-module>
						<?php include 'wheel.php'; ?>
					</wheel-module>
					
				</inner-column>
			</section>
		</main>
		
	</body>

</html>