<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Naming Numbers</title>



</head>




    
<?php
$class = "hide";
$numNameArr = [
			1 => [
				'arabic' => 'Yanāyir',
				'english' => 'January',
				'mandarin' => 'Yiyue',
				'french' => 'Janvier',
				'spanish' => 'Enero',
			],
			2 => [
				'arabic' => 'Fibrāyir',
				'english' => 'Febuary',
				'mandarin' => 'Eryue',
				'french' => 'Février',
				'spanish' => 'Febrero',
			],
			3 => [
				'arabic' => 'Māris',
				'english' => 'March',
				'mandarin' => 'Sanyue',
				'french' => 'Mars',
				'spanish' => 'Marzo',
			],
			4 => [
				'arabic' => 'Ibrīl',
				'english' => 'April',
				'mandarin' => 'Siyue',
				'french' => 'Avril',
				'spanish' => 'Abril',
			],
			5 => [
				'arabic' => 'Māyū',
				'english' => 'May',
				'mandarin' => 'Wuyue',
				'french' => 'Mai',
				'spanish' => 'Mayo',
			],
			6 => [
				'arabic' => 'Yūnyū',
				'english' => 'June',
				'mandarin' => 'Liuyue',
				'french' => 'Juin',
				'spanish' => 'Junio',
			],
			7 => [
				'arabic' => 'Yūlia',
				'english' => 'July',
				'mandarin' => 'Qiyue',
				'french' => 'Juillet',
				'spanish' => 'Julio',
			],
			8 => [
				'arabic' => 'Aġustus',
				'english' => 'August',
				'mandarin' => 'Bayue',
				'french' => 'Aout',
				'spanish' => 'Agosto',
			],
			9 => [
				'arabic' => 'Sibtambir',
				'english' => 'September',
				'mandarin' => 'Jiuyue',
				'french' => 'Septembre',
				'spanish' => 'Septiembre',
			],
			10 => [
				'arabic' => 'Uktūbar',
				'english' => 'October',
				'mandarin' => 'Shiyue',
				'french' => 'Cctobre',
				'spanish' => 'Octubre',
			],
			11 => [
				'arabic' => 'Nūfambir',
				'english' => 'November',
				'mandarin' => 'Shiyiyue',
				'french' => 'Novembre',
				'spanish' => 'Noviembre',
			],
			12 => [
				'arabic' => 'Dīsambir',
				'english' => 'December',
				'mandarin' => 'Shieryue',
				'french' => 'Décembre',
				'spanish' => 'Diciembre',
			],
	];
function numToName ($number, $language){
	return $numNameArr[$number][$language];
} 

$number = 0;
$name = '';
$language = '';

















if (
    isset($_POST['submitted']) &&
    (isset($_POST['input1']))  && 
    ($_POST['input1'] != '')   && 
    (isset($_POST['input2']))  && 
    ($_POST['input2'] != '')
) {


    $class = "output-field"; 
}
?>



<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Numbers to Names</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

            	<div class="input-field select-list" >
                    <select id="langauge-ID" name="language">
					  <option value="english" selected>English</option>
					  <option value="arabic">Arabic</option>
					  <option value="mandarin">Mandarin</option>
					  <option value="french">French</option>
					  <option value="spanish">Spanish</option>
					</select>
                    <label for="language-ID">Choose a language</label>
                </div>
                <div class="input-field">
                    <input id="number-ID" type="number" min="1" max="12" step="1" class="text-number-input" class="text-number-input" required name="number" placeholder="number??" value="">
                    <label for="number-ID">Enter number of month</label>
                </div>


                <button type="submit" name="submitted">
                	Namify
                </button>


                <div class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
                
            </form>
        </div>
    </main>


</body>
</html>

















































