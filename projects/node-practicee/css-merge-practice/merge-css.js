import fileSystem from "node:fs";
import { URL } from "url";



const styles = new URL("./styles", import.meta.url).pathname;
const start = styles += '/site.css';







// read start
// look for @imports
// if no @imports in imports
// append to finaloutput


function getCSS(file) {
	return fileSystem.readFileSync(file).toString();
}



function importExists(fileString) {
	
}



const dirPath = new URL("./styles", import.meta.url).pathname;

fileSystem.readdir(dirPath, function (error, files) {
	if (error) return console.log("error", error);

	files.forEach(function (file) {
		file = `${dirPath}/${file}`;

		//concat everything into minified variable
		minified += fileSystem.readFileSync(file).toString();
		//this doesnt retain the PSSST order of the framework.
	});

	fileSystem.appendFile(
		`${dirPath}/css-minified.css`,
		minified,
		function (error) {
			if (error) return console.log("ERRRROR:", error);
			console.log("MINIFIED COMPLETE");
		}
	);
});
