<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>57 Exercises</title>

    <style>

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
        padding: 15px;
        text-align: center;
        text-decoration: none;
        /*margin-bottom: 2px;*/
        font-size: 1.5rem;

        transition-duration: 0.2s;
      }

        a:visited {


            text-decoration: line-through;

        }

        li:hover {

            
            background-color: hsla(358, 92%, 30%, 1.00);
            font-family: expose;
            color: white;
            /*font-weight: bold;*/
            text-transform: uppercase;
            /*font-size: 30px;*/




        }


        span {
            display: none;

        }
        li:hover a {
            display: flex;
            justify-content: space-between;
        }



        li:hover span {
            display: block;

            opacity: 0.3;
            font-family: expose;
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
                    <li><a href="<?=$fileName?>"><span><?=$i?></span><?=$exercise?><span><?=$i?></span></a></li>

                <?php }} ?>
                    
                        
                </ol>
            </nav>
        </div>

    </main>
</body>
</html>



