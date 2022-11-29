const http = require('http');
let url = process.argv[2];

http.get(url, function (response) {
	response.on( 'data', function ( data ){
		process.stdout.write(data.toString() + '\n')
	})
})

