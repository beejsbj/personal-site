/*
input:
    amount of money
    exchange rate of euro, 1.1345964

process:
    calculate converted currency


    India: 74.503309
    Japan: 115.13758
    UK: 0.7387959
    Saudi: 3.75
    Euros: 0.87917218
    USA: 1
    Georgian lari : 3.0879372
    Canada: 1.2651392
*/











function bodyBuilder(){
    document.getElementById('bodyy').innerHTML = `  <label for="currFrom">Choose a Currency to convert From</label>
    <select id="currFrom">
  
    </select>
    <br>
    <label for="currTo">Choose a Currency to convert To</label>
    <select id="currTo">
  
    </select>
  
    <br>
    <br>
  
    <label for="amount"></label>
    <input type="text" name="amount" id="amount">
    <br>
    <br>
    <button onclick="converter()">Submit</button>
    <br>
    <br>
    <p id="output"></p>`;


    optioner();
}


const url = "https://v6.exchangerate-api.com/v6/4c27b485c62b5e044c78d085/latest/USD"

async function getRates(file) {
    let x = await fetch(file);
    let y = await x.json();
    let rates = y.conversion_rates;
    return rates;
}




function optioner(){

  //  import fetch from 'cross-fetch';

    var rates = getRates(url);




    let currToSelect = document.getElementById('currTo');
    let currFromSelect = document.getElementById('currFrom');



    for (let key in rates){
        let optionTo = document.createElement("option");
        let optionFrom = document.createElement("option");

        optionTo.value = key;
        optionTo.text = key;
        optionFrom.value = key;
        optionFrom.text = key;

        currToSelect.appendChild(optionTo);
        currFromSelect.appendChild(optionFrom);
    }







}



function calculator(amount, from, to){
    let rateFrom = rates[from];
    let rateTo = rates[to];

    return (amount * rateTo/rateFrom)


}



function converter(){
    let amountToConvert = Number(document.getElementById('amount').value);
    let from = document.getElementById('currFrom').value;
    let to = document.getElementById('currTo').value;

    let convertedAmount = calculator(amountToConvert, from, to);






    document.getElementById('output').innerHTML = `${amountToConvert} ${from}s is <br>
    ${(convertedAmount).toFixed(2)} ${to}`


}




