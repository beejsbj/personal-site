let args = process.argv.slice(2);

// *** exercise 5
// let [ , username, email] = args;
// let user = {username, email}
// console.log( user )

// *** exercise6
// let min = Math.min(...args)
// let output = `The minimum of [${args}] is ${min}`;
// console.log( output )

// *** 7
// module.exports = function average(...args) {
//     let sum = args.reduce((a, b) => a + b );
//     return sum / args.length;
// };

// *** 8
// module.exports = function midpoint(lower = 0, upper = 1) {
//         return (lower + upper) / 2;
// };

// *** 9
// module.exports = function makeImportant(string, num = undefined) {
// 	num = num == undefined ? string.length : num;

// 	let exclamations = "";
// 	while (exclamations.length < num) {
// 		exclamations += "!";
// 	}
// 	return string + exclamations;
// };


// *** 10

let username = args[0];
let comment = args[1];

function html(string, username, comment) {
	comment = comment.replaceAll("&" , "&amp;");
    comment = comment.replaceAll("<", "&lt;");
	comment = comment.replaceAll("'" , "&apos;");
    comment = comment.replaceAll(`"` , "&quot;");
    comment = comment.replaceAll(">", "&gt;");
    
    return `<b>${username} says</b>: "${comment}"`;
}

console.log(html`<b>${username} says</b>: "${comment}"`);


`;kln${ds};df`