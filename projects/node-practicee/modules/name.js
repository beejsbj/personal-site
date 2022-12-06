import { URL } from 'url'; 
import * as fs from 'fs';


const file = new URL('example.txt', import.meta.url).pathname;
const dirPath = new URL('.', import.meta.url).pathname;
const parentDirPath = new URL('../', import.meta.url).pathname;

console.log( file )
console.log( dirPath )
console.log( parentDirPath, '\n' )

let buffer = fs.readFileSync( file );
let fileText = buffer.toString();
// console.log(fileText);
let lines = fileText.split('\n');
let linesCount = lines.length - 1;

console.log( lines )
console.log( linesCount )

