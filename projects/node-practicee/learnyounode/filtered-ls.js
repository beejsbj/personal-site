const fs = require('fs') 
let dir = process.argv[2];
let filter = '.' + process.argv[3];

fs.readdir(dir, function(err, list) {
	list.forEach( function(item) {
		if (item.includes(filter)) console.log(item)
	})
})
