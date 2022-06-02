
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title></title>
	<style>
	html {
	--Normal: hsla(0, 0%, 60%, 1.00);
	--Fire: hsla(30, 95%, 60%, 1.00);
	--Water: hsla(200, 95%, 50%, 1.00);
	--Grass: hsla(116, 44%, 54%, 1.00);
	--Electric: hsla(50, 95%, 60%, 1.00);
	--Ice: hsla(170, 95%, 60%, 1.00);
	--Fighting: hsla(211, 85%, 42%, 1.00);
	--Poison: hsla(290, 95%, 60%, 1.00);
	--Ground: hsla(30, 100%, 29%, 1.00);
	--Flying: hsla(219, 66%, 78%, 1.00);
	--Psychic: hsla(2, 92%, 74%, 1.00);
	--Bug: hsla(78, 62%, 46%, 1.00);
	--Rock: hsla(46, 36%, 67%, 1.00);
	--Ghost: hsla(230, 41%, 55%, 1.00);
	--Dark: hsla(257, 11%, 37%, 1.00);
	--Dragon: hsla(350, 95%, 60%, 1.00);
	--Steel: hsla(191, 32%, 49%, 1.00);
	--Fairy: hsla(305, 73%, 75%, 1.00);
	}

	body > h1 {
		font-size: 5rem;
		margin-bottom: 2rem;
		text-align: center;
		color: yellow;
		-webkit-text-stroke-width: 2px;
  		-webkit-text-stroke-color: blue;
	}

	body {
		margin: 0 auto;
		max-width: 90%;
	}


	.pokegrid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	pokemon-card {
		display: block;
		width: 280px;
		height: 280px;
		padding: 10px;
		border-radius: 10px;
		background-color: var(--Normal);



	}

	pokemon-card h1 {
		text-align: center;
	}

	.details {
		display: flex;
		justify-content: space-around;
	}

	

</style>
</head>
<body>

	<h1>PoKeMoN</h1>


<div class="pokegrid">
	



<?php
include 'pocket-monsters.php';

	$pokemonArr = array_slice($pocket_monsters, 0, 30);
	// echo count($pokemonArr);

	// $id = $pokemonArr[0]["id"];
	// $name = $pokemonArr[0]["name"]["english"];

	// $type1 = $pokemonArr[0]["type"]["0"];
	// $type2 = $pokemonArr[0]["type"]["1"];







	foreach ($pokemonArr as $pokemon) {

		$id = $pokemon["id"];
		$name = $pokemon["name"]["english"];

		$type1 = $pokemon["type"]["0"];
		$type2 = $pokemon["type"]["1"];

		$hp = $pokemon["base"]["HP"];
		$atk = $pokemon["base"]["Attack"];
		$def = $pokemon["base"]["Defense"];

		if ($type1 == "Normal") {
			$type1 = $type2;
			$type2 = "Normal";
		}


		if (!$type2) {
	
			$type2 = $type1;
		} ?>

		<pokemon-card id="<?=$id?>" style="background-image: linear-gradient(45deg,var(--<?=$type1?>) 50%, var(--<?=$type2?>))">
		<?php


		if ($type2 == $type1) {
	
			$type2 = NULL;
		} ?>

		
			<h1><?=$name?></h1>
			<div class="details">
				<div class="types">
					<h2>Type</h2>
					<p><?=$type1?></p>
					<p><?=$type2?></p>
				</div>
				<div class="stats">
					<h2>Stats</h2>
					<p>HP = <?=$hp?></p>
					<p>Attack = <?=$atk?></p>
					<p>Defense = <?=$atk?></p>
				</div>

			</div>
		</pokemon-card>

		

	<?php	} ?>
	



</div>




</body>
</html>
























