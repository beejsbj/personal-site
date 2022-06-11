<!DOCTYPE html>
<html>

<head>
	<!-- metadata -->
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <meta name="description" content="The next steps">
   <meta property="og:image" content="https://peprojects.dev/alpha-4/burooj/assets/images/goalpost.png" />

   <link rel="stylesheet" href="css/style.css">

   <title>Resume</title>


                
   <!-- stylecss -->
</head>

<body>
   <a href="../index.html" class="svg-link-container">
         <svg class="b-svg" viewBox="0 0 1228 1811" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
        <g transform="matrix(1,0,0,1,-5624.94,-885.489)">
            <g transform="matrix(5.27473,0,0,4.59574,5343.12,1242.06)">
                <g id="b-letter" transform="matrix(1.29924,0,0,1.49119,59.2783,-44.5629)">
                    <path d="M-4.502,-22.146L-4.502,242L48.771,242L48.771,130.274L77.257,130.274C88.356,130.274 96.248,133.234 100.934,139.153C105.62,145.073 108.21,153.211 108.703,163.57L110.183,214.254C110.429,219.433 110.923,224.427 111.663,229.237C112.403,234.046 114.129,238.3 116.842,242L174.555,242L174.555,239.78C169.622,237.067 166.416,232.011 164.936,224.612C163.949,217.213 163.209,206.485 162.716,192.426C162.469,185.274 162.223,178.8 161.976,173.004C161.73,167.208 161.36,161.844 160.866,156.911C159.386,142.113 155.564,131.384 149.398,124.725C143.232,118.066 133.49,113.75 120.172,111.777L120.172,111.037C135.216,107.831 146.315,100.617 153.467,89.395C160.62,78.173 164.196,63.683 164.196,45.925C164.196,22.988 158.03,5.909 145.698,-5.313C133.366,-16.535 116.102,-22.146 93.905,-22.146L-4.502,-22.146ZM48.771,93.279L48.771,17.069L73.927,17.069C98.591,17.069 110.923,29.277 110.923,53.694C110.923,67.999 107.47,78.173 100.564,84.215C93.658,90.258 83.793,93.279 70.968,93.279L48.771,93.279Z" style="fill-rule:nonzero;"/>
                </g>
            </g>
        </g>
    </svg>
         </a>

   
      <article class=".site-main">
         <div class="inner-column"> 

   
            <h1>Resume</h1>
            <p>
                Stuff ive done.
            </p>


            <?php


            $json = file_get_contents("resume.json");
			$resumeData = json_decode($json, true);

			foreach ($resumeData as $resumeSection => $experiences) {

				echo "<section class='$resumeSection'>";
				echo "<h2>$resumeSection</h2>";
				echo "<ol class='innerlist'>";

				foreach ($experiences as $exp) {
					echo "<li>";
                    $role = $exp["role"];
                    $place = $exp["place"];
                    $startDate = $exp["dates"][0];
                    $endDate = $exp["dates"][1];
                    $dutiesArr = $exp["duties"];
                    $skillsArr = $exp["skills"];
                    $specialNote = $exp["specialNote"];


            ?>



                        <h3><?=$role?></h3>
                        <p class="dates"><?=$startDate?> - <?=$endDate?></p>
                        <h4><?=$place?></h4>
                        
                        <h5>duties</h5>
                        <ul>
                            <?php
                            foreach ($dutiesArr as $duty) {
                                echo "<li>$duty</li>";
                            }
                            ?>
                        </ul>
                        <h5>skills</h5>
                        <ul>
                            <?php
                            foreach ($skillsArr as $skill) {
                                echo "<li>$skill</li>";
                            }
                            ?>
                        </ul>
                        <blockquote><?=$specialNote?></blockquote>



					
                    
                    







            <?php
                    echo "</li>";
                }

				echo "</ol>";
				echo "</section>";



			}





            ?>
            <h2>test</h2>
            <ol class="innerlist">
                <li>
                    <h3>Role</h3>
                    <p class="dates">2012 - 2014</p>
                    <h4>place</h4>
                    
                    <h5>duties</h5>
                    <ul>
                        <li>duty1</li>
                        <li>duity2</li>
                        <li>duity3</li>
                    </ul>
                    <h5>skills</h5>
                    <ul>
                        <li>skill1</li>
                        <li>skill2</li>
                        <li>skill3</li>
                    </ul>
                    <blockquote>specialnote</blockquote>
                </li>
            </ol>

         </div>
      </article>

   <svg class="j-svg" viewBox="0 0 1157 1839" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
        <g transform="matrix(1,0,0,1,-5602.12,-885.489)">
            <g transform="matrix(5.27473,0,0,4.59574,5343.12,1242.06)">
                <g id="j-letter" transform="matrix(1.29924,0,0,1.49119,59.2783,-44.5629)">
                    <path d="M45.441,-22.146L-7.832,-22.146L-7.832,162.09C-7.832,179.848 -5.489,194.276 -0.803,205.375C3.883,216.473 10.172,225.044 18.065,231.086C25.957,237.129 34.959,241.137 45.071,243.11C55.183,245.083 65.665,246.069 76.517,246.069C87.369,246.069 97.851,244.96 107.963,242.74C118.075,240.52 127.077,236.204 134.97,229.792C142.862,223.379 149.151,214.685 153.837,203.71C158.523,192.735 160.866,178.861 160.866,162.09L160.866,-22.146L107.593,-22.146L107.593,162.09C107.593,168.749 107.162,174.854 106.298,180.403C105.435,185.952 103.832,190.762 101.489,194.831C99.146,198.901 96.001,202.107 92.055,204.45C88.109,206.793 82.93,207.964 76.517,207.964C70.351,207.964 65.234,206.793 61.164,204.45C57.095,202.107 53.888,198.901 51.545,194.831C49.202,190.762 47.599,185.952 46.736,180.403C45.873,174.854 45.441,168.749 45.441,162.09L45.441,-22.146Z" style="fill-rule:nonzero;"/>
                </g>
            </g>
        </g>
    </svg>


</body>

</html>