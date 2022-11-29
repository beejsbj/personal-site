const mymodule = require('./mymodule.js')

let dir = process.argv[2];
let ext = process.argv[3];


mymodule( dir, ext, function(err, files) {
	files.forEach( function( file ) {
		console.log(file);
	})
})