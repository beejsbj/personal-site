const http = require("http");
const fileSystem = require("fs");
const map = require("through2-map");
const url = require('url');

let port = process.argv[2];

const server = http.createServer(function (req, res) {
	req.pipe(map(function (chunk) {
				return chunk.toString().toUpperCase();
			})
		).pipe(res);
});
server.listen(port);
