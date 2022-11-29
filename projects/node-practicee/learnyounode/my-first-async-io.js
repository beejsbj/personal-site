const fs = require('fs') 
let filePath = process.argv[2];


fs.readFile(filePath, 'utf8', function (err, buff) {
	console.log(buff.split('\n').length - 1)
})

