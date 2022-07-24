<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Validate Password</title>



</head>




    
<?php
 

$passwordLocker = [
                    "username" => "password",
                ];



$username = '';
$password = '';






$class = "hide";
 // ;





if (
    isset($_POST['submitted'])  &&
    (isset($_POST['username'])) && 
    (isset($_POST['password'])) && 
    ($_POST['username'] != '')  && 
    ($_POST['password'] != '')
) {

    $username = $_POST['username'];
    $password = $_POST['password'];

    if ((isset($passwordLocker[$username])) && ($passwordLocker[$username] == $password)) {
        $output = "Welcome to the cave, <span>$username</span>";
    } else {
        $output = "I don't know <span>you<span>";
    }
    $class = "output-field"; 

}





    





?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Password Validation</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <div class="input-field">
                    <input id="username-ID" type="text" class="text-number-input" required name="username" placeholder="username??" value="">
                    <label for="username-ID">Username</label>
                </div>
                <div class="input-field">
                    <input id="password-ID" type="password" name="password" placeholder="password?!" value="">
                    <label for="password-ID">password</label>
                </div>


                <button type="submit" name="submitted">
                    Validate
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

















































