const http = require('http');

let url1 = process.argv[2];
let url2 = process.argv[3];
let url3 = process.argv[4];


http.get(url1, function(response) {
	let data1 = '';
	response.on('data', function(data) {
		data1 += data.toString()
	})
	response.on( 'end', function(end){
		console.log(data1);
		http.get(url2, function(response) {
			let data2 = '';
			response.on('data', function(data) {
				data2 += data.toString()
			})
			response.on( 'end', function(end){
				console.log(data2);
				http.get(url3, function(response) {
					let data3 = '';
					response.on('data', function(data) {
						data3 += data.toString()
					})
					response.on( 'end', function(end){
						console.log(data3);
					})
				})
			})
		})
	})
})




// function juggle(url, cb){
// 	http.get(url, function(response) {
// 		let data = '';
// 		response.on('data', function(data) {
// 			data += data.toString()
// 		})
// 		response.on( 'end', function(end){
// 			console.log(data);
// 			cb()
// 		})
// 	})
// }


// jug(url1, function () {
// 	jug(url2, function() {
// 		jug(url3, function(){
// 			return;
// 		})
// 	})
// });