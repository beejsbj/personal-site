
const net = require('net')
let port = process.argv[2]
let now = new Date;

var formatter = require('./node_modules/strftime/strftime.js')
let formatted = formatter('%F %H:%M', now) + '\n'


// let formatted = `${now.getFullYear()}-${1 + now.getMonth()}-${now.getDate()} ${now.getHours() }:${now.getMinutes()}`


const server = net.createServer( function( socket ) {
	socket.write( formatted )
	socket.end()
})



server.listen(port)



