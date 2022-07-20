<?php include('functions.php'); ?>
<?=format(queryString())?>
<?php include('templates/modules/header/header.php'); ?>
<?php format($pageData);?>

		<main class="page-content">
			<!-- inner column outside moduke -->
			<section class='page-section' id='and-its-id'>
			<inner-column>

				Section within inner-column in index page

			</inner-column>
			</section>

			<!-- inner column inside module -->
			<?php include('templates/modules/section-test/section-test.php'); ?>


			<?php renderPage($pageData); ?>

		</main>









<?php include('templates/modules/footer/footer.php'); ?>