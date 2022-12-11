import http from "node:http";
import url from "node:url";

const person = {
	name: "derek",
};
const PORT = 1291;
const HOSTNAME = "localhost";

const server = http.createServer(function (request, response) {
	if (request.url === "/favicon.ico") {
		response.statusCode = 200;
		response.setHeader('Content-Type', 'image/x-icon');
		response.end();
		console.log("favicon requested");
		return;
	}

	const urlObj = new URL(request.url, `http://${HOSTNAME}:${PORT}`);
	const user = urlObj.searchParams.get("user");
	const text = urlObj.searchParams.get("text") ?? 'html';

	response.statusCode = 200;
	response.setHeader('Content-Type', `text/${text}`);	

	response.write(``);
	response.write(`
		<h1>Hello ${user}</h1>
		<ul>
			<li><a href="?user=Burooj"> Burooj </a></li>
			<li><a href="?user=Derek"> Derek </a></li>
			<li><a href="?user=Ivy"> Ivy </a></li>
			<li><a href="?user=${user}&text=plain"> See plain </a></li>
		</ul>
		`);

	response.end();
});

server.listen(PORT, HOSTNAME, function () {
	console.log("listening...");
});
