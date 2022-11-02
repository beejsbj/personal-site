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
				<h1 class="welcome attention-voice">Welcome</h1>
			</header>
			<action-area>
				<form>
					<ul class="card-filter">
						<li>
							<input type="checkbox" id="universal" name="universal" value="universal">
							<label for="universal">Universal</label>
						</li>
						<li>
							<input type="checkbox" id="macos" name="macos" value="macos">
							<label for="macos">MacOS</label>
						</li>
						<li>
							<input type="checkbox" id="finder" name="finder" value="finder">
							<label for="finder">Finder</label>
						</li>
						<li>
							<input type="checkbox" id="sublime-text" name="sublime-text" value="sublime-text">
							<label for="sublime-text">Sublime Text</label>
						</li>
						<li>
							<input type="checkbox" id="divvy" name="divvy" value="divvy">
							<label for="divvy">Divvy</label>
						</li>
					</ul>
					<input-field>
						<input type="number" id="num-cards" name="num-cards" value="10" min="5" step="1">
						<label class="calm-voice" for="num-cards">How many cards would you like to review?</label>
					</input-field>
					<div class="buttons">
						<button id="begin" class="hide-opacity" type="reset"> Begin </button>
					</div>
				</form>
			</action-area>
		</card-module>
	</inner-column>
</main>
<?php include('templates/modules/footer/footer.php'); ?>
<script src="scripts/flashcards.js"></script>
