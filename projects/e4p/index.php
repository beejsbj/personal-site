<?php include('functions.php'); ?>
<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
        <meta property="og:image" content="[XXXXXXXXX]">
        <link rel="stylesheet" href="css/style.css">
        <title>57 Exercises</title>
        
    </head>

    <body>
        <header>
            <div class="inner-column">
                <h1>57 Exercises</h1>
            </div>
        </header>
        <main>
            <div class="inner-column">
                <?php
                    $page = $_GET['page'] ?? 'list'; 
                    if ($page == 'list') {
                        include('list.php');
                    } else {
                       include("exercises/$page");
                    }
                 ?>
            </div>
        </main>
    </body>

</html>