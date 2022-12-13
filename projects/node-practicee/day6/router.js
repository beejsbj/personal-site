import http from "node:http";
import url from "node:url";
import fileSystem from "node:fs";


const PORT = 1291;
const HOSTNAME = "localhost";

const server = http.createServer(function (request, response) {
	// quickly ignore favicon request
	if (request.url === "/favicon.ico") {
		response.statusCode = 200;
		response.setHeader('Content-Type', 'image/x-icon');
		response.end();
		console.log("favicon requested");
		return;
	}

	// create url obj to easily acess value from key
	const urlObj = new URL(request.url, `http://${HOSTNAME}:${PORT}`);
	let page = urlObj.searchParams.get("page") ?? 'home';
	let pagePath = `./pages/${page}.html`;
	console.log(urlObj)

	// check if page exits, else returns 404
	if (fileSystem.existsSync(pagePath)) {
		page = new URL(`./pages/${page}.html`, import.meta.url).pathname
		response.statusCode = 200;
		response.setHeader('Content-Type', `text/html`);
	} else {
		page = new URL(`./pages/404.html`, import.meta.url).pathname
		response.statusCode = 404;
		response.setHeader('Content-Type', `text/html`);
	}


	// menu module, reads the file and writes it
	const menu = fileSystem.readFileSync('./module/menu.html').toString();
	response.write(menu);

	// reads page file, and stores into variable and writes it
	let html = fileSystem.readFileSync(page).toString();
	response.write(html);
	
	response.end();
});

server.listen(PORT, HOSTNAME, function () {
	console.log("listening...");
});
