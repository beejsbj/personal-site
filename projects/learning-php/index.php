<html>
	<head>
		<title>locusts.com</title>
		<meta name="description" content="$ah$">
		<meta property="og:image" content= "https://i.ytimg.com/vi/-sqtA7bLVr8/maxresdefault.jpg">
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Rock+Salt&display=swap');
			body > * {
				padding: 20px;
				/*border: 5px solid yellow;*/
				padding-bottom: 500px;
			}



			header {
				color: forestgreen;
				background-color: lightpink;
				font-family: monospace;
			}
			body {
				background-color: wheat;
			}
			span {
				color: purple;
				font-family: 'Rock Salt';
			}
			main {
				background-color: ghostwhite;
				font-family: serif;
			}

			footer {
				background-color: gray;
				font-family: sans-serif;
			}
			p {
				font-size: 1.2rem;

			}

			em {
				font-family: 'Rock Salt';
				color: blue;
			}

			strong {
				font-family: 'Rock Salt';
				color: yellow;
			}

			.under-logic {
				display: block;
				color: white;
				background-color: darkgray;
			}

			.monospan {
				font-family: monospace;
				font-size: 1.3rem;
				font-weight: bold;
				color: darkred;
			}

			.array-hsl {
				display: block;
				background-color: hsla(90, 20%, 10%, 1.00);
				/*padding: 20px;*/
				color: white;
			}

			.array-hsl .lib1 {
				padding: 20px;
				background-color: hsla(90, 20%, 20%, 1.00);
			}
			.array-hsl .lib2 {
				padding: 20px;
				background-color: hsla(90, 20%, 30%, 1.00);
			}
			.array-hsl .lib3 {
				padding: 20px;
				background-color: hsla(90, 20%, 40%, 1.00);
			}
			.array-hsl .lib4 {
				padding: 20px;
				background-color: hsla(90, 20%, 50%, 1.00);
			}













			.loop-de-loop {
				display: block;
				background-color: hsla(350, 50%, 90%, 1.00);
				/*padding: 20px;*/
				color: black;
			}



			.loop-de-loop .lib1 {
				padding: 20px;
				background-color: hsla(350, 50%, 80%, 1.00);
			}
			.loop-de-loop .lib2 {
				padding: 20px;
				background-color: hsla(350, 50%, 70%, 1.00);
			}
			.loop-de-loop .lib3 {
				padding: 20px;
				background-color: hsla(350, 50%, 60%, 1.00);
			}
			.loop-de-loop .lib4 {
				padding: 20px;
				background-color: hsla(350, 50%, 50%, 1.00);
			}































		</style>
	</head>
	
	<body>

		<?php


		$noun = "Rocket";
		$pluralNoun = "toes";
		$verb = "drink";
		$adjective = "windy";
		$bodyParts = "ears";

			echo '<header><h1>hello im a header</h1>';
			echo "<h2>" . "11 + 11 is " . (11 + 11) . "</h2></header>";


			echo "<main><h1>me Main</h1><p>Today, every student has a computer small enough to fit into their <span>" . $noun . "</span>. You can solve any math problem by simply pushing the computer’s little <span>" . $pluralNoun . "</span>.

				Computers can add, multiply, divide, and <em>" . $verb . "</em> (present tense). They can also <em>" . $verb . "</em> (present tense) better than a human.

				Some computers have their own <strong>" . $bodyParts . "</strong>. Other’s have a/an <strong><em>" . $adjective . "</em></strong> screen that shows all kinds of <span>" . $pluralNoun . "</span> and <strong><em>" . $adjective . "</em></strong> figures.</p></main>"











		?>


		<footer>
			<h1>found a Footer</h1>
			<p>Today, every student has a computer small enough to fit into their <span><?=$noun?></span>. You can solve any math problem by simply pushing the computer’s little <span><?=$pluralNoun?></span>.

				Computers can add, multiply, divide, and <em><?=$verb?></em> (present tense). They can also <em><?=$verb?></em> (present tense) better than a human.

				Some computers have their own <strong><?=$bodyParts?></strong>. Other’s have a/an <strong><em><?=$adjective?></em></strong> screen that shows all kinds of <span><?=$pluralNoun?></span> and <strong><em><?=$adjective?></em></strong> figures.</p>
		</footer>




		<div class="under-logic">
			<?php
			echo "<h1>FIGHT</h1>";
 			$attack = 12;
 			$defense = 8;
 			$hp = 20;

 			echo "<p>enemy hp is  <span class='monospan'>$hp</span>, youre attacking with an attack of  <span class='monospan'>$attack</span></p>";

 			$damage = $attack - $defense;
 				$hp = $hp - $damage;

 			if ($attack <= $defense) {
 				echo "<p>No damage, since the defense stat is too high.</p>";
 			} 

 			elseif ($hp == 0) {
				echo "<p>  <span class='monospan'>$defense</span> damage inflicted, enemy dead.</p>";
			}
			else {
				echo "<p>  <span class='monospan'>$defense</span> damage inflicted, enemy HP is now  <span class='monospan'>$defense</span>.";
			}
 			

 			?>
		</div>


		<div class="array-hsl">

			<?php

				$madObject = [
					
					"noun" => ["rocket", "country", "human", "star"],
					"pluralNoun" => ["toes", "apes", "holes", "chips"],
					"verb" => ["drink", "spit", "tumble", "destroy"],
					"adjective" => ["human", "deep", "dark", "putrid"],
					"bodyParts" => ["hair", "skin", "nose", "toes"],
				];

				



			?>


			<h1><em>not </em>Objects</h1>
			<div class="lib1">
				<p>Today, every student has a computer small enough to fit into their <span><?=$madObject["noun"][0]?></span>. You can solve any math problem by simply pushing the computer’s little <span><?=$madObject["pluralNoun"][0]?></span>.

				Computers can add, multiply, divide, and <em><?=$madObject["verb"][0]?></em> (present tense). They can also <em><?=$madObject["verb"][0]?></em> (present tense) better than a human.

				Some computers have their own <strong><?=$madObject["bodyParts"][0]?></strong>. Other’s have a/an <strong><em><?=$madObject["adjective"][0]?></em></strong> screen that shows all kinds of <span><?=$madObject["pluralNoun"][0]?></span> and <strong><em><?=$madObject["adjective"][0]?></em></strong> figures.</p>
			</div>

			<div class="lib2">
				<p>Today, every student has a computer small enough to fit into their <span><?=$madObject["noun"][1]?></span>. You can solve any math problem by simply pushing the computer’s little <span><?=$madObject["pluralNoun"][1]?></span>.

				Computers can add, multiply, divide, and <em><?=$madObject["verb"][1]?></em> (present tense). They can also <em><?=$madObject["verb"][1]?></em> (present tense) better than a human.

				Some computers have their own <strong><?=$madObject["bodyParts"][1]?></strong>. Other’s have a/an <strong><em><?=$madObject["adjective"][1]?></em></strong> screen that shows all kinds of <span><?=$madObject["pluralNoun"][1]?></span> and <strong><em><?=$madObject["adjective"][1]?></em></strong> figures.</p>
			</div>

			<div class="lib3">
				<p>Today, every student has a computer small enough to fit into their <span><?=$madObject["noun"][2]?></span>. You can solve any math problem by simply pushing the computer’s little <span><?=$madObject["pluralNoun"][2]?></span>.

				Computers can add, multiply, divide, and <em><?=$madObject["verb"][2]?></em> (present tense). They can also <em><?=$madObject["verb"][2]?></em> (present tense) better than a human.

				Some computers have their own <strong><?=$madObject["bodyParts"][2]?></strong>. Other’s have a/an <strong><em><?=$madObject["adjective"][2]?></em></strong> screen that shows all kinds of <span><?=$madObject["pluralNoun"][2]?></span> and <strong><em><?=$madObject["adjective"][2]?></em></strong> figures.</p>
			</div>

			<div class="lib4">
				<p>Today, every student has a computer small enough to fit into their <span><?=$madObject["noun"][3]?></span>. You can solve any math problem by simply pushing the computer’s little <span><?=$madObject["pluralNoun"][3]?></span>.

				Computers can add, multiply, divide, and <em><?=$madObject["verb"][3]?></em> (present tense). They can also <em><?=$madObject["verb"][3]?></em> (present tense) better than a human.

				Some computers have their own <strong><?=$madObject["bodyParts"][3]?></strong>. Other’s have a/an <strong><em><?=$madObject["adjective"][3]?></em></strong> screen that shows all kinds of <span><?=$madObject["pluralNoun"][3]?></span> and <strong><em><?=$madObject["adjective"][3]?></em></strong> figures.</p>
			</div>

		</div>


		<div class="loop-de-loop">
			
		
			
			<?php

			$arr = ["hair", "skin", "nose", "two", "toes", 1, true];


			$bikapiMon = [
				"id" => 1001,
				"name" => "Bikapi",
				"favFood" => "cherry",
				"age" => 40,
				"adopted" => false,
			];

			echo "<h1>i have " . $arr[3] . " " . $arr[2] . "s</h1>";




			?>



			<p id=<?=$bikapiMon["id"]?> >the monster <?=$bikapiMon["name"]?>'s favortie food is <?=$bikapiMon["favFood"]?>. they are <?=$bikapiMon["age"]?> years old.</p>



			<?php
			$nums = [0, 1, 2, 3];

				foreach ($nums as $num) {
					echo "<div class='lib" . ($num + 1) . "'>

							<p>

							Today, every student has a computer small enough to fit into their 

							<span>
							" . $madObject["noun"][$num] ."
							</span>.

							 You can solve any math problem by simply pushing the computer’s little

							  <span>
							 " . $madObject["pluralNoun"][$num] ."
							 </span>.

							Computers can add, multiply, divide, and 

							<em>
							" . $madObject["verb"][$num] ."
							</em>.

							 They can also 

							 <em>
							 " . $madObject["verb"][$num] ."
							 </em>

							  better than a human.

							Some computers have their own 

							<strong>
							" . $madObject["bodyParts"][$num] ."
							</strong>. 

							Other’s have a/an 

							<strong><em>
							" . $madObject["adjective"][$num] ."
							</em></strong>

							 screen that shows all kinds of 

							<span>
							" . $madObject["pluralNoun"][$num] ."
							</span>

							 and 

							<strong><em>
							" . $madObject["adjective"][$num] ."
							</em></strong>

							 figures.

							</p>

						</div>";


				}

			?>





		</div>


















	</body>





	
</html>