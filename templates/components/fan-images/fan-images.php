<?php
$images = $section['images'] ?? [1, 2, 3];
?>
<fan-images>
	<div class="card-group" data-index="0" data-status="active">

		<div class="little-card card"></div>
		<div class="big-card card"></div>
		<div class="little-card card"></div>
		<div class="big-card card"></div>
		<div class="little-card card"></div>
		<div class="big-card card"></div>
		<div class="little-card card"></div>
		<div class="big-card card"></div>

	</div>
</fan-images>


<style>
	fan-images {
		margin: 0px;
		/* height: 100vh; */

		display: grid;
		place-items: center;

	}

	fan-images :is(.card-group, .card) {
		aspect-ratio: 1;

	}

	fan-images :is(.card-group,
		.big-card) {
		width: 100%;
	}

	fan-images .card-group {
		position: relative;
		transition: transform 400ms ease;
	}



	fan-images .card {
		background-color: rgba(255, 255, 255, 0.05);
		position: absolute;
		transition: transform 800ms cubic-bezier(0.05, 0.43, 0.25, 0.95);

		background-position: center;
		background-size: cover;
	}

	fan-images .big-card {
		border-radius: 50%;
	}

	fan-images .little-card {
		width: 12vmin;
		border-radius: 50%;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		box-shadow: -1vmin 1vmin 2vmin rgba(0, 0, 0, 0.25);
		pointer-events: none;

	}

	fan-images .big-card:nth-child(2) {
		background-image: url('images/<?= ($images[0]['slug'] ?? 'square.jpg') ?>');
		transform: translateX(-10%) rotate(-1deg);
	}

	fan-images .big-card:nth-child(4) {
		background-image: url('images/<?= ($images[1]['slug'] ?? 'square.jpg') ?>');
		transform: rotate(2deg);
	}

	fan-images .big-card:nth-child(6) {
		background-image: url('images/<?= ($images[2]['slug'] ?? 'square.jpg') ?>');
		transform: translateX(-6%) rotate(-3deg);
	}

	fan-images .big-card:nth-child(8) {
		background-image: url('images/<?= ($images[3]['slug'] ?? 'square.jpg') ?>');
		transform: translate(10%, 3%) rotate(5deg);
	}

	fan-images .little-card:nth-child(1) {
		background-image: url('images/<?= ($images[4]['slug'] ?? 'square.jpg') ?>');

	}

	fan-images .little-card:nth-child(3) {
		background-image: url('images/<?= ($images[5]['slug'] ?? 'square.jpg') ?>');

	}

	fan-images .little-card:nth-child(5) {
		background-image: url('images/<?= ($images[6]['slug'] ?? 'square.jpg') ?>');

	}

	fan-images .little-card:nth-child(7) {
		background-image: url('images/<?= ($images[7]['slug'] ?? 'square.jpg') ?>');

	}

	fan-images .card-group:hover>.card {
		box-shadow: -2vmin 2vmin 3vmin rgba(0, 0, 0, 0.4);
	}

	fan-images .card-group:hover>.big-card:nth-child(2) {
		transform: translate(-75%, 16%) rotate(-24deg);
	}

	fan-images .card-group:hover>.big-card:nth-child(4) {
		transform: translate(-25%, 8%) rotate(-8deg);
	}

	fan-images .card-group:hover>.big-card:nth-child(6) {
		transform: translate(25%, 8%) rotate(8deg);
	}

	fan-images .card-group:hover>.big-card:nth-child(8) {
		transform: translate(75%, 16%) rotate(24deg);
	}

	fan-images .card-group:hover>.little-card:nth-child(1) {
		transform: translate(200%, -160%) rotate(-15deg);
		z-index: 1;
	}

	fan-images .card-group:hover>.little-card:nth-child(3) {
		transform: translate(160%, 170%) rotate(15deg);
		z-index: 1;
	}

	fan-images .card-group:hover>.little-card:nth-child(5) {
		transform: translate(-200%, -170%) rotate(15deg);
		z-index: 1;
	}

	fan-images .card-group:hover>.little-card:nth-child(7) {
		transform: translate(-280%, 140%) rotate(-15deg);
		z-index: 1;
	}
</style>