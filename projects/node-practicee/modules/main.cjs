const fileSystem = require('fs');

let file = 'example.txt' //10 lines

let buffer = fileSystem.readFileSync( file );
let fileText = buffer.toString();
// console.log(fileText);
let lines = fileText.split('\n');
let linesCount = lines.length - 1;

console.log( lines )
console.log( linesCount )

