const fs = require('fs') 
let filePath = process.argv[2]

buffer = fs.readFileSync( filePath )
arr = buffer.toString().split('\n')
console.log(arr.length - 1)