const http = require('http');
let url = process.argv[2];

http.get(url, function (response) {
	let allData = '';
	response.on('data', function(data) {
		allData += data.toString()
	})
	response.on( 'end', function(end){
		console.log(allData.length);
		console.log(allData);
	} )
})