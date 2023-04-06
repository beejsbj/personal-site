
/*
input:
    principal
    rate
    time in years
    number of compoundings per year

process:
    run formula on inputs

output:
    Amount
*/



function calculator(p, r, t, n){


    let base = 1 + ((r/100) / n)
    let exp = (n * t)

    return p * Math.pow(base, exp)
}


function main(){
    let principal = Number(document.getElementById('principal').value);
    let rate = Number(document.getElementById('rate').value);
    let time = Number(document.getElementById('time').value);
    let compound = Number(document.getElementById('compound').value);


    let finalAmount = calculator(principal, rate, time, compound).toFixed(2);
    
    document.getElementById('output').innerHTML = `$${principal} invested at ${rate}% for ${time} years
                                                    compounded ${compound} times per year is $${finalAmount}.`
}