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
<nav>
    <ol>
        <?php
            $exercises = array_slice( scandir('exercises'), 2 );
            $i = 0;
            foreach ($exercises as $exercise) { 
                $exName = getTitleCase(substr($exercise, 3, -4));
                $i++; 
                ?>
                <li>
                    <a class="" href="?page=<?=$exercise?>">
                        <span class="ex-number">
                            <?=$i?>
                        </span>
                        <span class="ex-name link-wrapper">
                            <?=$exName?>
                            <?php include 'shape.php' ?>   
                        </span>
                       
                        <span class="ex-number">
                            <?=$i?>
                        </span>
                    </a>
                </li>
        <?php } ?>
    </ol>
</nav>