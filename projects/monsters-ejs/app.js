import express from "express";
import { URL } from "url";
import axios from "axios";
import fileSystem from "node:fs";

const app = express();

const PORT = 1982;
const __dirname = new URL("./", import.meta.url).pathname;

app.use(express.static("public"));
app.set("view engine", "ejs");

//page routing
app.get("/", function (request, response) {
	const options = {
		root: __dirname + "/public",
	};
	response.sendFile("home.html", options); //sendFile with options for root
});

app.get("/about", function (request, response) {
	response.send("<h1>This is the About</h1>"); //directly send html and end response
});

app.get("/list", function (request, response) {
	var digimons = fileSystem.readFileSync(`${__dirname}/digidex.json`);
	digimons = JSON.parse(digimons);
	response.render("list", {
		arr: [1, 2, 3, 4, 5],
		digimons,
	}); //rendering a view of ejs with data being passed to it
});

app.get("/api", function (request, response) {
	//api data
	response.send({
		date: new Date(),
		site: "monsters-in-ejs",
		array: [1, 2, 3],
	});
});

//404 gotta be last
app.get(function (request, response) {
	response.status(404);
	response.send("<h1>You are lost</h1>");
});

app.listen(PORT);


