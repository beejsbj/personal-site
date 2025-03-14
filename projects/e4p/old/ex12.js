/*

12	Computing Simple Interest
Computing simple interest is a great way to quickly figure out whether an investment has value. It’s also a good way to get comfortable with explicitly coding the order of operations in your programs.

Create a program that computes simple interest. Prompt for the principal amount, the rate as a percentage, and the time, and display the amount accrued (principal + interest).

The formula for simple interest is , where P is the principal amount, r is the annual rate of interest, t is the number of years the amount is invested, and A is the amount at the end of the investment.

Example Output
​ 	Enter the principal: 1500
​ 	Enter the rate of interest: 4.3
​ 	Enter the number of years: 4
​ 	
​ 	After 4 years at 4.3%, the investment will
​ 	be worth $1758.

Constraints
    Prompt for the rate as a percentage (like 15, not .15). Divide the input by 100 in your program.
    Ensure that fractions of a cent are rounded up to the next penny.
    Ensure that the output is formatted as money.
Challenges

    Ensure that the values entered for principal, rate, and number of years are numeric and that the program will not let the user proceed without valid inputs.
    Alter the program to use a function called calculateSimpleInterest that takes in the rate, principal, and number of years and returns the amount at the end of the investment.
    In addition to printing out the final amount, print out the amount at the end of each year.




//////
Input:
    principle amount
    interest rate
    time
process:
    calculate total interest
output:
 display amoount
    */






function calculator(p, r, t){
    let results = {};

    for (let i = 1; i <= t; i++){
        results[`Year ${i}`] = (p * (1 + (r / 100) * i)).toFixed(2);
    }


    


    return results;

}


function stringer(obj){
    let str = ''
    for (let key in obj){
        str += `${key}: ${obj[key]} <br>`
    }
    return str
}



function main(){

    let principle = Number(document.getElementById('principle').value);
    let rate = Number(document.getElementById('rate').value);
    let time = Number(document.getElementById('time').value);

    let years = calculator(principle, rate, time)
    let amount = years[`Year ${time}`];

    document.getElementById('output').innerHTML = `After ${time} years at ${rate}%, the investment will <br>
                                                    be worth $${amount}. <br>
                                                    <br>
                                                    Yearly amounts: <br>
                                                    ${stringer(years)}`




}
