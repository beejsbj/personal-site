const http = require("http");
const fileSystem = require("fs");
const map = require("through2-map");
const url = require('url');

let port = process.argv[2];
	

const server = http.createServer(function (req, res) {
	
	const urlObj = new URL(req.url, `http://localhost:${port}`);
	let parsetime = urlObj.pathname == '/api/parsetime';
	let unixtime = urlObj.pathname == '/api/unixtime';
	let time = new Date(urlObj.searchParams.get('iso'));


	console.log('---------------------------------')
	console.log('hi')
	console.log('---------------------------------')
	console.log()
	console.log('---------------------------------')


	res.writeHead(200, { 'Content-Type': 'application/json' }) 
	
	


	if (parsetime) {
		let parsed = {
						"hour": time.getHours(),  
						"minute": time.getMinutes(),  
						"second": time.getSeconds()  
				     }
	    res.write(JSON.stringify(parsed)); 
	    res.end();

	}
	if (unixtime) {
		let parsed = { 
						"unixtime": time.getTime()
					}
	    res.write(JSON.stringify(parsed));  
	    res.end();

	}


});
server.listen(port);
