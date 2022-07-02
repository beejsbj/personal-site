<?php 

// show error verbosely.
function showErrors() {
  error_reporting(E_ALL);
  ini_set('display_errors', '1');
}
showErrors();


// to print formatted arrays that are legible.
  function format($variable) {
    echo "<pre>";
      echo "<code>";
        echo print_r( $variable );
      echo "</code>";
    echo "</pre>";
  }




  function getTemplate($page) {
    // if (isset($_GET["jollyroger"])) {

    //      include('modules/detail/index.php');

    //     }
    include('modules/' . $page . '/index.php');

}



function getDatabase(){

  if (!file_get_contents("data/data.json")) {
    file_put_contents("data/data.json", '[]');
  } 
  $json = file_get_contents("data/data.json");
  return json_decode($json, true);
}



function writeData($array){

  $jsonedData = json_encode($array);
  $dataFile = 'data/data.json';
  
  file_put_contents($dataFile, $jsonedData);

}



function activePage($current){

  if ($_GET["page"] == $current) {
    echo "active";
  } 
}




function isLoggedIn($password){
  $secretKey = 'ticktock';

  if ($password == $secretKey) {
    return true;
  } 

  else {
    return false;
  }
}