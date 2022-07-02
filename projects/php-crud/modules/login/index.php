<?php

	//check if button is set
	
	if ( isset($POST['password']) ) {
		$_SESSION['name'] = $POST['password'];
	}



	if ($_SESSION['name'] == 'passworb') {
		include('modules/add/index.php');
	} else {
		include('modules/login/form.php');
	}
	

	
	//retrieve input data from POST
	

	//check if it matches session data, if so change $page to add


?>

