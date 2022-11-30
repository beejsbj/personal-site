const fileSystem = require('fs') 

module.exports = function lister( dir, ext, callback ) {
	ext = '.' + ext;
	//get directory with fileSystem.readdir
	fileSystem.readdir(dir, function(err, files) {
		if (err) {
			return callback(err);
		}
		let filtered = files.filter( function(file) {
			return file.includes(ext);
		} )
		//pass the files to the callback function
		callback(null, filtered)
	})
	//callback function prints the directory list if it matches extention
}



