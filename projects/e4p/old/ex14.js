/*

input:
    order amount
    state choice as text, either abbrevieated or not



*/




function main(){

    let amount = Number(document.getElementById('amount').value);
    let state = document.getElementById('state').value.toLowerCase();

    let total = amount;


    if (state === 'wisconsin' || state === 'wi'){
        total += amount * 0.055; 
    }





    document.getElementById('output').innerHTML = `	The total is $${total.toFixed(2)}`
}