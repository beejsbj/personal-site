<?php 
$footerJson = file_get_contents("data/modules/footer.json"); $footerData = json_decode($footerJson, true); $components = $footerData['components'];

?>
<footer>
	<inner-column>
		<site-map>
			<nav>
				<h3 class="solid-voice"> Product </h3>
				<ul>
					<li> Diam orci </li>
					<li> Diam orci viverra </li>
					<li> Suspendisse viv </li>
					<li> Suspendisse viverra </li>
					<li> Diam orci </li>
					<li> Vuspendisse </li>
				</ul>
			</nav>
			<nav>
				<h3 class="solid-voice"> Information </h3>
				<ul>
					<li> Diam orci </li>
					<li> Diam viverra </li>
					<li> Suspe viv </li>
					<li> Suspendisse viv </li>
				</ul>
			</nav>
			<nav>
				<h3 class="solid-voice"> Information </h3>
				<ul>
					<li> Diam orci </li>
					<li> Diam viverra </li>
					<li> Suspendisse viv </li>
				</ul>
			</nav>
			
			<subscribe-box>
				<h3 class="solid-voice"> Subscribe </h3>
				<?php include('templates/components/email-signup/email-signup.php'); ?>
				<p class="whisper-voice">
					Gravida sed justo, justo, id est et. Amet tristique convallis sed porttitor nullam eu ut. Duis et odio aliquam bibendum. Metus et lectus id viverra fringilla magna morbi. 
				</p>
			</subscribe-box>
		</site-map>
	</inner-column>
	<inner-column class="wide">
		<mast-foot>
			<picture class="logo">
				<?php include('images/logo.php'); ?>
			</picture>
			<?php include('templates/components/site-menu/site-menu.php'); ?>
			<?php include('templates/components/buttons/buttons.php'); ?>
		</mast-foot>
	</inner-column>
</footer>
</body>

</html>