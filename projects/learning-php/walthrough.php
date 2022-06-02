<?php



echo "4 + 3 = ";
echo 4 + 3 . "<br>";


echo "4 - 3 = ";
echo 4 - 3 . "<br>";

echo "4 * 3 = "; 
echo 4 * 3 . "<br>" ;

echo "4 / 3 = ";
echo 4 + 3 . "<br>";



$string = "monkeyfeathers";

echo $string;


$guests = 5;
$people = $guests + 1;
$berries = 15;
$berriesBox = 26;
$boxPrice = 5;


$totalBerries = $people * $berries;

$boxNeeded = $totalBerries / $berriesBox;

$totalCost = $boxPrice * $boxNeeded;





$msg = "Theres Ivy and $guests guests. each person will want $berries berries. a box contains $berriesBox, so we will need atleast $boxNeeded. which will cost us about $totalCost";

echo $msg;











$name = "Jacob";

$noun = "human";

$food = "elephant"; //ivy

/*fghfgh*/

$adj = "pretty";

$verb1 = "drink";

$verb2 = "kill";

$verb3 = "love";



$madders = "<br><br><br><br>It was " . $food . " day at school, and " . $name . " was super " . $adj . " for lunch. But when she went outside to eat, a " . $noun . " stole her " . $food . "! " . $name . " chased the " . $noun . " all over school. She " . $verb1 . ", " . $verb2 . ", and " . $verb3 . " through the playground. Then she tripped on her " . $noun . " and the " . $noun . " escaped! Luckily, " . $name . "’s friends were willing to share their " . $food . " with her.";

echo $madders;