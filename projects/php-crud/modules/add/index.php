<?php
	if (isset($_POST['added'])) {
		// echo "added";
	}
   	$fileDestination = null;
	$art = null;


	// format( $_FILES );


	if ( isset($_FILES['imageUpload']) ) {

		//store image file in variable
		$fileTmpLocation = $_FILES['imageUpload']['tmp_name']; 

		//store file name in variable
		$fileName = $_FILES['imageUpload']['name'];

		$fileDestination = "images/uploads/$fileName";

		// echo $fileDestination;

		//move file to image folder
		move_uploaded_file($fileTmpLocation, $fileDestination);



		$art["title"] = $_POST["title"];
		$art["imageUrl"] ="uploads/" . $fileName;

		format($art);

		$jollyRogerArr = getDatabase();
		array_push($jollyRogerArr, $art);

		format($jollyRogerArr);
		// function that writes new array to json file
		writeData($jollyRogerArr);
	}
?>

<h1 class="loud-voice">
	Add
</h1>

 <form method="POST" enctype="multipart/form-data">
 	 <?php if ($fileDestination) { ?>
        <h2>You just uploaded this image!!! Great job</h2>


      <?php } ?>
 		<!-- <picture id="previewImage">
          <img src="<?=$fileDestination?>" alt="preview">
        </picture> -->
	<field>
		<label>Upload the Image</label>
		<input id="ff" type="file" name="imageUpload" accept="image/*">
	</field>

	<field>
		<label>title</label>
		<input type="text" name="title">
	</field>

	<button type="submit" name="added">
		add flag
	</button>

</form>








<!-- 
 <script>
      // preview image selected before upload

      var input = document.querySelector('#ff');
      
      input.addEventListener('change', function(event) {
        var preview = document.querySelector('#previewImage img');
        var previewSource = URL.createObjectURL( input.files[0] );
        console.log(previewSource);
        preview.src = previewSource;
      });
      // insert image
    </script> -->