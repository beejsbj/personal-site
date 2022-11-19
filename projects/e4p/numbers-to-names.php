

    
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
function numToName ($number, $language, $array){
	return $array[$number][$language];
} 

$number = '';
$name = '';
$language = '';

if ( isset($_POST['submitted']) ) {
	$number = $_POST['number'];
	$language = $_POST['language'];

	$name = numToName ($number, $language, $numNameArr);

	$language = ucfirst($language);

	$output = "The name of the month in <span>$language</span> is <span>$name</span>.";

    $class = "output-field"; 
}
?>

<form id="e4p" autocomplete='off' method="POST">

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
        <input id="number-ID" type="number" min="1" max="12" step="1" class="text-number-input" class="text-number-input" required name="number" placeholder="number??" value="<?=$number?>">
        <label for="number-ID">Enter number of month</label>
    </div>


    <button type="submit" name="submitted">
    	Namify
    </button>


    <div id="e4p-output" class="<?=$class?>">
        <p>
            <?=$output?>
        </p>
    </div>
    
</form>














































