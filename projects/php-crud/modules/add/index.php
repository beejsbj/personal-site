<?php
	if (isset($_POST['added'])) {
		// echo "added";
	}
   	$fileDestination = null;
	$art = null;


	// format( $_FILES );

	if ( isset($_POST['imageLink']) ) {

		$art["imageUrl"] = $_POST['imageLink'];

	}

	if ( isset($_FILES['imageUpload']) && $_FILES['imageUpload']['size'] > 0 ) {

		//store image file in variable
		$fileTmpLocation = $_FILES['imageUpload']['tmp_name']; 

		//store file name in variable
		$fileName = $_FILES['imageUpload']['name'];

		$fileDestination = "images/uploads/$fileName";

		// echo $fileDestination;

		//move file to image folder
		move_uploaded_file($fileTmpLocation, $fileDestination);

		$art["imageUrl"] ="images/uploads/" . $fileName;
		

		// format($art);
		
	}

	


	if (isset($_POST["title"])) {
			$art["title"] = $_POST["title"];
		} else {
			$art["title"] = '';
		}


	if (isset($_POST["description"])) {
		$art["description"] = $_POST["description"];
	} else {
		$art["description"] = '';
	}



	if (isset($art['imageUrl'])) {
		$jollyRogerArr = getDatabase();
		array_push($jollyRogerArr, $art);

		// format($jollyRogerArr);
		// function that writes new array to json file
		writeData($jollyRogerArr);
	}

	// $inputTypeUpload = 'type="file" name="imageUpload"';
	// $inputTypeLink = 'type="text" name="imageLink"';



?>
<h1 class="loud-voice">Add</h1>
<form method="POST" enctype="multipart/form-data">
	<?php if ($fileDestination) { ?>
	<h2>You just uploaded this image!!! Great job</h2>
	<?php } ?>
	<!-- <picture id="previewImage">
          <img src="<?=$fileDestination?>" alt="preview">
        </picture> -->
	<div class="image-input-container">
		<field>
			<label>Link to image</label>
			<input id="ff" type="text" name="imageLink">
		</field>
		<h3 class="attention-voice"> OR </h3>
		<field>
			<label>Upload the Image</label>
			<input id="ff" type="file" name="imageUpload" accept="image/.jpg, image/.png, image/.jpeg">
		</field>
	</div>
	<field>
		<label>Title</label>
		<input type="text" name="title">
	</field>
	<field>
		<label>Description</label>
		<input type="text" name="description">
	</field>
	<button class="button-21" type="submit" name="added"> add flag </button>
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