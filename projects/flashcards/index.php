<?php 
	include('functions.php'); 
	$currentPage = currentPage();
	$pageData = getPageData($currentPage);
?>
<?php include('templates/modules/header/header.php'); ?>
<main class="page-content">
	<inner-column>
		<card-module>
			<header>
				<h1 class="welcome">Welcome</h1>
			</header>
			<action-area>
				<form>
					<ul>
						<li>
							<input type="checkbox" id="shortcuts" name="shortcuts" value="Bike">
							<label for="shortcuts"> Shortcuts</label>
						</li>
						<li>
							<input type="checkbox" id="concepts" name="concepts" value="Bike">
							<label for="concepts"> concepts</label>
						</li>
					</ul>
					<input-field>
						<input type="number" id="num-cards" name="num-cards" value="20" min="5" step="1">
						<label for="num-cards">How many cards would you like to review?</label>
					</input-field>
					<button id="begin" type="reset"> Begin </button>
				</form>
			</action-area>
		</card-module>
	</inner-column>
</main>
<?php include('templates/modules/footer/footer.php'); ?>
<script src="scripts/flashcards.js"></script>
