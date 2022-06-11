<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
	<meta property="og:image" content= "[XXXXXXXXX]">

	<link rel="stylesheet" href="css/style.css">

	<title>Audiophile</title>
</head>






<?php
function formatCode($code) {
  echo "<pre>";
  var_dump($code);
  echo "</pre>";
}
// formatCode($products);


$json = file_get_contents("data.json");


$audiophileData = json_decode($json, true);
$products = $audiophileData["products"];

?>





<body>
	<header class="site-header">

		<section class="header-block1">
			<div class="inner-column">
				<nav>
					<a href="#">CART</a>
				</nav>
			</div>
		</section>

		<section class="header-block2">
			<div class="inner-column">
				<h1>Audiophile</h1>
			</div>
		</section>

	</header>

	<main class="site-main">
		

		<section class="main-block1">


			<filter-list>
				<h2>Filter</h2>
				<li>Sort</li>

			</filter-list>


			<div class="inner-column">
				<ul class="product-list">

					<?php

					$cart = ['hello', 'apples'];

					




					foreach ($products as $product) {

						$image = $product["image"];
						$brand = $product["brand"];
						$name =  $product["name"];
						$color = $product["color"];
						$category = $product["category"];
						$tagline = $product["tagline"];
						$description = $product["description"];
						$price = $product["price"];

						$saleTag = "hide";

						if ($product["on-sale"]) {
							$saleTag = "show";
							
						}

						$features = $product["features"];

					 ?>

					<product-card>
						<p class="<?=$saleTag?>">SALE</p>
						<picture>
							
							<img src="<?=$image?>" alt="">
						</picture>

						
						<card-description>
							<product-name><?=$name?></product-name>
							<product-brand><?=$brand?></product-brand>
							<product-tagline><?=$tagline?></product-tagline>
							<product-description><?=$description?></product-description>



							<details>
	    					<summary>Features</summary>

							<?php
							foreach ($features as $feature) {
								echo "<li> $feature </li>";				
							}

							if (isset($_POST['addToCart'])) {
						
								array_push($cart, $name);
							}?>

							</details>
							<div class="flex-button-parent">
								<product-price>$<?=$price?></product-price>
								<button type="submit" name="addToCart">Add to card</button>
							</div>
						</card-description>
					</product-card>



					<?php } ?>
				</ul>
			</div>

			<cart-list>
				<h2>CART</h2>
				<?php


				if (count($cart) > 0) {
					foreach ($cart as $item) {

					echo "<li>$item</li>";
					
					}
				}


				?>

			</cart-list>


		</section>

		
	</main>

	<footer class="site-footer">

		<section class="footer-block1">
			<div class="inner-column">
				
			</div>
		</section>

	</footer>
</body>
</html>