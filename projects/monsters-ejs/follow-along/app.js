import express from 'express';

const app = express(); 
const PORT = 1996;


app.get('/', function( request, response ){
	response.send('<h1>Hello</h1>')
})


app.listen(PORT, function(){
	console.log('listening to port')
})
