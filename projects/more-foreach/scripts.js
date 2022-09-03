var myStuff = [
	'tissue box',
	'cola bottle',
	'tea',
	'comb',
	'sanitizer spray',
	'empty perfume bottle',
	'clock',
	'wallet'
	]

var myStuffDict = [
	{
		name: 'tissue box',
		type: 'utility'
	},
	{
		name: 'coca cola',
		type: 'drink'
	},
	{
		name: 'tea',
		type: 'drink'
	},
	{
		name: 'comb',
		type: 'tool'
	},
	{
		name: 'sanitizer spray',
		type: 'utility'
	},
	{
		name: 'empty perfume bottle',
		type: 'trash'
	},
	{
		name: 'clock timer',
		type: 'tool'
	},
	{
		name: 'wallet',
		type: 'tool'
	},
	{
		name: 'old recipts',
		type: 'trash'
	}
]

var trashList = []
var drinksList = []


myStuffDict.forEach( function (item, index) {
	var name = item.name
	var type = item.type
	if (type == 'trash') {
		trashList.push(name)
	}
	if (type == 'drink') {
		drinksList.push(name)
	}
	if (type != 'tool' && type != 'utility') {
		console.log(name)
	}
})


console.log(trashList)
console.log(drinksList)




var filterTrash = myStuffDict.filter( function (item) {
	return item.type == 'trash';
})

console.log('Filtereted trash')
console.log(filterTrash)




function renderList (array) {
	var heading = document.createElement('h2');
	heading.textContent = array[0].type.toUpperCase()
	var list = document.createElement('ul');
	

	array.forEach( function(item) {
		var listItem = document.createElement('li');
		listItem.textContent = item.name
		list.appendChild(listItem)
	})
	document.body.appendChild(heading)
	document.body.appendChild(list)
}


renderList(filterTrash)

//////////////

var testArr = Array.from('trash')

console.log(testArr)

// console.log(testArr.isArray())
console.log(testArr.length)

string = 'string'
console.log(string.toUpperCase())


testArr.shift()
testArr.reverse()
testArr.push('c')
testArr.reverse()
console.log(testArr)
console.log(testArr.find( function(letter){
	return letter == 'r'
} ))

mappedArr = testArr.map( function(letter) {
	return letter.toUpperCase()
} )
console.log(mappedArr)

