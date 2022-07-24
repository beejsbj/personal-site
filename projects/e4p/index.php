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
        <style>
        body {
            padding-bottom: 500px;
        }

        /*Links*********************************************/
        ol {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        li {
            width: 100%;
            font-family: monospace;
            background-color: #000000;
            color: white;
            text-align: center;
            text-decoration: none;
            /*margin-bottom: 2px;*/
            font-size: 1.5rem;
            transition-duration: 0.1s;
        }

        a {
            padding: 25px;
        }

        a:visited {
            text-decoration: line-through;
        }

        li:hover {
            background-color: hsla(358, 92%, 30%, 0);
            font-family: expose;
            color: black;
            /*font-weight: bold;*/
            text-transform: uppercase;
            /*font-size: 30px;*/
        }

        .ex-number {
            display: none;
        }

        li:hover a {
            display: flex;
            justify-content: space-between;
        }

        li:hover .ex-number {
            display: block;
            opacity: 0.4;
            font-family: expose;
            color: white;
        }
        </style>
    </head>

    <body>
        <header>
            <div class="inner-column">
                <h1>57 Exercises</h1>
            </div>
        </header>
        <main>
            <div class="inner-column">
                <nav>
                    <ol>
                        <?php
                include('exercises-list.php');

                function dasher($string){
                    //lowercase the string
                    //split string at space 
                    $splitString = explode(" ", $string);

                    //add dashes 
                    $finalString = implode("-", $splitString);

                    return strtolower($finalString);
                }

                $i = 0;
                foreach ($exercises as $exercise) { 
                    $fileName = dasher($exercise) . ".php";
                    $i++;

                    if (file_exists($fileName)) {
                        
                    
                ?>
                        <li><a class="link-wrapper" href="<?=$fileName?>">
                                <span class="ex-number">
                                    <?=$i?></span>
                                <span class="ex-name"><?=$exercise?></span>
                                <div class="shape-wrapper">
                                    <div class="shape red-fill jelly"><svg x="0px" y="0px" viewBox="0 0 108.1 47" enable-background="new 0 0 108.1 47">
                                            <polygon fill="#FF0000" points="19.5,0,110.7,0,80.1,32.7,3.1,47 " />
                                        </svg></div>
                                    <div class="shape cyan-fill jelly"><svg x="0px" y="0px" viewBox="0 0 108.1 47" enable-background="new 0 0 108.1 47">
                                            <polygon fill="#00FFFF" points="11,3,85.1,0 118.8,45.6,14.3,29 " />
                                        </svg></div>
                                </div>
                                <span class="ex-number">
                                    <?=$i?></span>
                            </a></li>
                        <?php }} ?>
                    </ol>
                </nav>
            </div>
        </main>
    </body>

</html>