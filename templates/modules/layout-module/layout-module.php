<?php


$id = $_GET['layout'] ?? $section['id'] ?? rand(1, 4);

if ( file_exists("templates/modules/layout$id/layout$id.php") ) {
	include("templates/modules/layout$id/layout$id.php");
} else {
	$notFoundHeading = 'Layout';
	include('templates/pages/pageNotFound.php');
}
