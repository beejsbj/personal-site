import express from 'express';
import monsters from './digidex.json' assert { type: 'json' }

const app = express(); 
const PORT = 1996;

// app.view("view engine", "ejs"); WRONG
app.set("view engine", "ejs");
app.use( express.static('styles') );



app.get('/', function( request, response ){
	// response.render('partials/menu'); doesnt work
	response.render('home');
})

app.get('/monsters', function( request, response ){
	response.render('monsters-list', { monsters });
})

app.get('/monsters/:name', function( request, response ){
	let monster = monsters.find(function (monster) {
		return monster.name.toLowerCase() == request.params.name.toLowerCase();
	})
	response.render('monster-detail', { monster });
})


//page not found
app.use(function( request, response ){
	response
		.status(404)
		.render('404', { query: request.url });
})

app.listen(PORT, function(){
	console.log('listening to port');
})


function findDigimon(id) {
	return monsters.find(function (monster) {
		return monster.id == id || monster.name.toLowerCase() == id;
	})
}

