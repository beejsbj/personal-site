/*
input:
    item 1 price and quantitiy
    item 2 price and quantitiy
    item 3 price and quantitiy
process:
    calc subtotal using price and quantity
    calc tax amount at 5.5%
    calc total incl tax
output:
    item prices and quantities
    subtotal
    tax amount
    total
*/





//variables/////////////////////////////////////////////////////////////////
let items = [];
const taxRate = 0.055;


//fucntion to only allow number/////////////////////////////////////////////////
function numCheck(){
  if (isNaN(document.getElementById('itemprice').value) || isNaN(document.getElementById('itemquantity').value)){
    
    alert('Please enter a number')

    document.getElementById('itemprice').value = ''
    document.getElementById('itemquantity').value = ''
    
}
}

//reset item list/////////////////////////////////////////////////////////////////
function resetter(){
  items = [];
  document.getElementById('itemlist').innerHTML = ''
}

//function to add items to list//////////////////////////////////////////////////////
function itemLister(){

  items.push({price: Number(document.getElementById('itemprice').value), quantity: Number(document.getElementById('itemquantity').value)});

  document.getElementById('itemprice').value = '';
  document.getElementById('itemquantity').value = '';

  let outputList = '';


  for (let i = 0; i < items.length; i++){
    let obj = items[i];

    outputList += `Item ${i + 1}:: price: $${obj.price}, quantity: ${obj.quantity} <br>`;
  }


  document.getElementById('itemlist').innerHTML = outputList;


}

//function to find subtotal by iterating through array of objects/////////////////////
function subtotaler(array){
  let subtotal = 0;
  
  for (let i = 0; i < array.length; i++){
    let obj = array[i];
    subtotal += obj.price * obj.quantity;
  }
  return Number(subtotal)
}

//function to calculate taxes and final total and output/////////////////////////////
function selfCheckout(){


  let subTotal = subtotaler(items);
  let tax = (subTotal * taxRate);
  let total = (subTotal + tax).toFixed(2);
  
  document.getElementById('output').innerHTML = `Subtotal: $${subTotal} <br>
                                                  Tax: $${tax} <br>
                                                  Total: $${total}`;
}