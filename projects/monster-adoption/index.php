<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
	<meta property="og:image" content= "[XXXXXXXXX]">

	<link rel="stylesheet" href="css/style.css">

	<title>Monsters</title>


	<style>
		/**STRUCTURE******/


		* {
			box-sizing: border-box;
		}


		body {
			background-color: hsla(39, 100%, 50%, 1.00);
			padding: 15px;
			font-family: sans-serif;

		}


		.inner-column {
			max-width: 80ch;
			margin: 0 auto;
		}

		/**TYPOGRAPHY******/






		/**Sections******/

		h1 {
			margin: 1em 0;
			font-size: 3rem;
			font-family: cursive;
			font-weight: 700;
			text-align: center;
		}

		ul {
			display: flex;
			flex-direction: column;
			gap: 20px;
		}

		li {

			padding: 40px;

			background-color: blue;
			color: white;
		}



		.monster-name {
			font-size: 2rem;
			margin-top: 1em;
		}

		.monster-description {
			font-size: 1rem;
			margin-top: 1em;
		}

		.adopt-bool {
			font-family: cursive;
			font-size: 1.5rem;
			text-align: center;
			background-color: orange;
			margin-top: 1em;
			padding: 10px 5px;
			border-radius: 50px;
			color: black;

			align-self: center;
		}


		@media (min-width: 600px){

			.monster-card {
				display: flex;
				text-align: center;
				align-items: center;
				gap: 20px;

			}
			ul {
				flex-direction: row;
				flex-wrap: wrap;

			}

			li {
				/*flex-basis: 30%;*/

			}
		}



		picture {
			/*width: 80vw;*/
			/*padding: 20px;*/
		}


	</style>
</head>
<body>

	<div class="inner-column">
		


	<?php

	$lima = [

		"id" => 5674,
		"name" => "Limabean",
		"favFood" => "Lima beans",
		"age" => 4,
		"adopted" => false,
		"portrait" => "images/limabean.jpg"
	];

	$codey = [

		"id" => 9874,
		"name" => "Codey",
		"favFood" => "Cod fish",
		"age" => 44,
		"adopted" => false,
		"portrait" => "images/codey.jpg"
	];

	$fragoo = [

		"id" => 564,
		"name" => "Fragoo",
		"favFood" => "Ice cream",
		"age" => 17,
		"adopted" => true,
		"portrait" => "images/fragoo.jpg"
	];

	$reads = [

		"id" => 937,
		"name" => "Ms Reads-a-lot",
		"favFood" => "fried bookworms",
		"age" => 32,
		"adopted" => true,
		"portrait" => "images/miss-reads-a-lot.jpg"
	];

	$banana = [

		"id" => 777,
		"name" => "Banana",
		"favFood" => "cucumbers",
		"age" => 71,
		"adopted" => false,
		"portrait" => "images/mr-banana.jpg"
	];

	$shadow = [

		"id" => 999,
		"name" => "Shadow",
		"favFood" => "hedgehogs",
		"age" => 9,
		"adopted" => true,
		"portrait" => "images/shadow.jpg"
	];

	$orangina = [

		"id" => 203,
		"name" => "Orangina",
		"favFood" => "tangerines",
		"age" => 23,
		"adopted" => false,
		"portrait" => "images/orangina.jpg"
	];

	$monsters = [$orangina, $codey, $fragoo, $reads, $banana, $shadow, $lima, $reads];

	echo "<h1>Monster adoption Agency</h1>";
	echo "<ul>";

	foreach ($monsters as $monster) {


		if ($monster["adopted"]) {
			$adopted = "Too late, already taken";
		} else {
			$adopted = "Please adopt me!";
		}



		echo "<li>
				<div class='monster-card'>
					<picture class='monster-image'>
						<img src='" . $monster["portrait"] . "'>
					</picture>

					<div class'desc'>
						<h2 class='monster-name'>" . $monster["name"] . "</h2>

						<p class='monster-description'>My name is " . $monster["name"] . ", i am " . $monster["age"] . " years old, and I love eating " . $monster["favFood"] . "</p>

						<p class='adopt-bool'>" . $adopted . "</p>

					</div>
				</div>
			</li>";



	}
			
	echo "</ul>";



	


	?>








	</div>





</body>
</html>