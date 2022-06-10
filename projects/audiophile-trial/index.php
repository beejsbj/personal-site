
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














<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
	<meta property="og:image" content= "[XXXXXXXXX]">

	<link rel="stylesheet" href="style.css">

	<title>Document</title>
	<style>
		* {
			box-sizing: border-box;
		}

		body {

		}

		a {
			display: block;
			text-decoration: none;
			color: inherit;
		}
		p a {
			display: inline;
			color: blue;
			text-decoration: underline;
		}

		picture {
			display: block;
			position: relative;
		}

		picture h2.show {
			display: block;
			position: absolute;
			top: 0px;
			right: 0px;
			transform: rotateZ(45deg);
			background-color: red;
			color: white;
		}

		.hide {
			display: none;
		}

		img {
			display: block; 
			width: 100%;
			height: auto;
		}
		.product-list {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
		}
		product-card {
			display: block;
			padding: 10px;
			width: 500px;
			border: 4px solid black;
		}

		h5 {
			color: green;
		}
	</style>
</head>
<body>
	<ul class="product-list">







		<?php

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



			




			// echo "] <br><br><br>";


		 ?>

		<product-card>
			<picture>
				<h2 class="<?=$saleTag?>">SALE</h2>
				<img src="<?=$image?>" alt="">
			</picture>
			<h2><?=$name?></h2>
			<h3><?=$brand?></h3>
			<h4><?=$tagline?></h4>
			<p><?=$description?></p>


			<h5>Features</h5>
			<ul>



				<?php

			foreach ($features as $feature) {

				echo "<li> $feature </li>";
					
			}


				?>
			</ul>
			<h5><?=$price?></h5>

		</product-card>



		<?php } ?>
	</ul>
</body>
</html>








































