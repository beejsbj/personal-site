/*
input
  length
  width
process
  calc area,
  divide by 350, round up result.
output
  rounded up number from division
*/


const sqFtToGallon = 350;


function gallonRectangle(){ //function to find area and number of gallons for rectangle
    let width = document.getElementById('width').value;
    let length = document.getElementById('length').value;

    let area = width * length;
    
    let gallons = Math.ceil(area / sqFtToGallon);
    
    document.getElementById('output').innerHTML =  `You will need to purchase ${gallons} gallons of <br>
                                                    paint to cover ${area} square feet.`
    
}

function gallonRound(){ //function to find area and number of gallons for round
    let radius = document.getElementById('radius').value;

    let area = Math.PI * radius * radius;
    
    let gallons = Math.ceil(area / sqFtToGallon);
    
    document.getElementById('output').innerHTML =  `You will need to purchase ${gallons} gallons of <br>
                                                    paint to cover ${area} square feet.`
    
}

function gallonLshape(){ //function to find area and number of gallons for l shaped cieling
    let outerLength = document.getElementById('outerLength').value;
    let outerWidth = document.getElementById('outerWidth').value;
    let innerLength = document.getElementById('innerLength').value;
    let innerWidth = document.getElementById('innerWidth').value;

    let area = outerLength * (outerWidth - innerWidth) + innerWidth * (outerLength - innerLength);
    
    let gallons = Math.ceil(area / sqFtToGallon);
    
    document.getElementById('output').innerHTML =  `    You will need to purchase ${gallons} gallons of <br>
                                                        paint to cover ${area} square feet.`
    
}


function ifRound(){
    document.getElementById('question').innerHTML = `   <br><label for="radius">What is the radius?</label>
                                                        <input type="text" id="radius" oninput="numCheck()"><br>`
    
}

function ifRectangle(){
    document.getElementById('question').innerHTML = `   <br><label for="length">What is the length?</label>
                                                        <input type="text" id="length" oninput="numCheck()"><br>
                                                        <br>
                                                        <label for="width">What is the width?</label>
                                                        <input type="text" id="width" oninput="numCheck()"><br>`
}

function ifLshaped(){
    document.getElementById('question').innerHTML = `   <br><label for="outerLength">What is the outer length?</label>
                                                        <input type="text" id="outerLength" oninput="numCheck()"><br>
                                                        <br>
                                                        <label for="outerWidth">What is the outer width?</label>
                                                        <input type="text" id="outerWidth" oninput="numCheck()"><br>
                                                        <br>
                                                        <label for="innerLength">What is the inner length?</label>
                                                        <input type="text" id="innerLength" oninput="numCheck()"><br>
                                                        <br>
                                                        <label for="innerWidth">What is the inner width?</label>
                                                        <input type="text" id="innerWidth" oninput="numCheck()"><br>`
}




//function to check if input is number
function numCheck(){

    if (document.getElementById('round').checked && isNaN(document.getElementById('radius').value)){
        alert('Please enter a number');
    }
    if (document.getElementById('rectangle').checked && (isNaN(document.getElementById('length').value) || isNaN(document.getElementById('width').value))){
        alert('Please enter a number');
    }
    if (document.getElementById('lshape').checked && (isNaN(document.getElementById('outerLength').value) || isNaN(document.getElementById('outerWidth').value) || isNaN(document.getElementById('innerLength').value) || isNaN(document.getElementById('innerWidth').value))){
        alert('Please enter a number');
    }

}


//function to run appropriate function based on whats selected
function runner(){ 
    if (document.getElementById('round').checked){
        gallonRound();
    }
    if (document.getElementById('rectangle').checked){
        gallonRectangle();
    }
    if (document.getElementById('lshape').checked){
        gallonLshape();
    }
}