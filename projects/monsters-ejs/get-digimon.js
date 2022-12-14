import express from "express";
import { URL } from "url";
import axios from "axios";
import fileSystem from "node:fs";
const __dirname = new URL("./", import.meta.url).pathname;


function getDigimon() {
	let digimons = [];
	let digis = [
		"Greymon",
		"gabumon",
		"biyomon",
		"tentomon",
		"palmon",
		"gomamon",
		"patamon",
		"gatomon",
		"angemon",
		"angewomon",
		"rosemon",
		"magnadramon",
		"omnimon",
		"pegasusmon",
		"growlmon",
		"gummymon",
		"relemon",
		"sakuyamon",
		"Devimon",
		"Lady Devimon",
		"Leomon",
		"veemon",
		"renamon",
		"Terriermon",
	];
	let count = digis.length;
	for (var i = 1; i <= count; i++) {
		fetch(`https://www.digi-api.com/api/v1/digimon/${digis[i]}`)
			.then(function (data) {
				return data.json();
			})
			.then((digimon) => {
				// console.log(digimon)
				digimons.push(digimon);
				if (
					digimons.length >= count &&
					!fileSystem.existsSync(`${__dirname}/digidex.json`)
				) {
					fileSystem.writeFile(
						`${__dirname}/digidex.json`,
						JSON.stringify(digimons),
						function () {
							console.log("data file made");
						}
					);
				}
			})
			.catch(function () {
				console.log("oops");
			});
	}
}

getDigimon();