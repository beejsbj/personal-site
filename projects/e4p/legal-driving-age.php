<style>
    .output-field {
        flex-direction: column;
        gap: 20px;
    }
</style>

    
<?php
$legalAges = [
    "argentina" => 17,
    "brazil" => 18,
    "canada" => 16,
    "china" => 18,
    "denmark" => 17,
    "france" => 18,
    "india" => 18,
    "japan" => 18,
    "mexico" => 18,
    "niger" => 23,
    "salvador" => 15,
    "saudi arabia" => 18,
    "sweden" => 16,
    "usa" => 16,
];

$age = "";

$legalInCountryArr = [];
$countryOutput = "";

$class = "hide";
// $class = "output-field";

if (isset($_POST["submitted"]) && isset($_POST["age"]) && $_POST["age"] != "") {
    $age = $_POST["age"];

    foreach ($legalAges as $country => $countryAge) {
        if ($age >= $countryAge) {
            array_push($legalInCountryArr, $country);
        } else {
        }
    }

    if (empty($legalInCountryArr)) {
        $countryOutput = "<li><span>No where</span></li>";
    } else {
        foreach ($legalInCountryArr as $country) {
            $countryOutput =
                $countryOutput .
                "<li><span>" .
                ucfirst($country) .
                "</span></li>";
        }
    }

    $output = "You are old enough to legally drive in: ";

    $class = "output-field";
}
?>

<form id="e4p" autocomplete='off' method="POST">

    <div class="input-field">
        <input id="age-ID" type="number" class="text-number-input" required name="age" placeholder="aGe??!!?" min="1" step="1" value="<?= $age ?>">
        <label for="age-ID">What is your age?</label>
    </div>
    <button type="submit" name="submitted">
        Legalize
    </button>
    <div id="e4p-output" class="<?= $class ?>">
        <p>
            <?= $output ?>
        </p>
        <ul class='country-list'>
            <?= $countryOutput ?>
        </ul>
    </div>   
</form>
