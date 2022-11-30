const http = require( 'http' );
const fileSystem = require('fs'); 

let port = process.argv[ 2 ];
let file = process.argv[ 3 ];

let fileStream = fileSystem.createReadStream( file );


const server = http.createServer( function( req, res ) {
	fileStream.pipe(res)
} )
server.listen( port )