import express from "express";
import { URL } from "url";
import axios from "axios";
import fileSystem from "node:fs";
const __dirname = new URL("./", import.meta.url).pathname;

async function getDigimon() {
	let digimons = [];
	let count = 1422;
	for (var i = 1; i <= count; i++) {
		console.log(i);
		const data = await fetch(`https://www.digi-api.com/api/v1/digimon/${i}`);
		const digimon = await data.json();
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
	}
}

// getDigimon();

const raw = fileSystem.readFileSync(`${__dirname}/digidex.json`)
(function cleanData(){
	console.log(raw)
})()