<?php include('functions.php'); ?>
<?php include('templates/modules/header/header.php'); ?>

		<main class="page-content">

			<section class='page-section' id='and-its-id'>
			<inner-column>

				<p><?=format(queryString())?></p>

			</inner-column>
			</section>


			<?php 

			getPage();

			?>

		</main>



<?php include('templates/modules/footer/footer.php'); ?>