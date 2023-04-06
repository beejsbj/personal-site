function versionA(){
    document.body.innerHTML = `
        <h2 style="color: #ce0000">Exercise 8: Pizza Party</h2>
        <link rel="stylesheet" href="challenge10.css">
        <script src="ex8.js"></script>
        
        <style>
            body {
                background-color: #F3d8A6;
            }
        
            div {
                background-color: #fa7d29;
                color: #006600;
                outline-style: solid;
            }
            label{
                display: inline-block;
                clear: left;
                width: 200px;
                text-align: left;
                margin-left: 10px;
                font-weight: bold;
            }
            input {
                display: inline-block;
                background-color: #006600;
                color: white;
                margin-bottom: 1px;
                margin-top: 1px;
            }
            button {
        margin-left: 20px;
        background-color: green;
        }
        </style>
        
        <body>
            <div>
                <br>
                <label for="people">How many people?</label>
                <input type="text" id="people" oninput="numCheck()">
                <br>
                <label for="pizzas">How many pizzas?</label>
                <input type="text" id="pizzas" oninput="numCheck()">
                <br>
                <label for="slices">How many slices per pizza?</label>
                <input type="text" id="slices" oninput="numCheck()">
                <br>
                <br>
                </div>
            <br>
            <button onclick="numCheckA()">Submit</button>
            
            
            <p id="output" style="color: #ce0000">
            </p>
        </body>
    `
}

/*
input:
  number of people
  number of pizzas
  slices per pizza
  
process:
  calculate total number of slices
  calculate number of slices per person
  calc left over
*/


function numCheckA(){
    if (isNaN(document.getElementById('people').value) || isNaN(document.getElementById('pizzas').value) || isNaN(document.getElementById('slices').value)){
      
      alert('Please enter a number')

      document.getElementById('pizzas').value = ''
      document.getElementById('people').value = ''
      document.getElementById('slices').value = ''
  } else {
    pizzaSlicerA()
}
}

function pizzaSlicerA(){
  let pizzas = document.getElementById('pizzas').value;
  let people = document.getElementById('people').value;
  let slices = document.getElementById('slices').value;
  
  let totalSlices = pizzas * slices
  let leftoverSlices = totalSlices % people
  let slicePerPerson = (totalSlices - leftoverSlices) / people
  
  if (slicePerPerson > 1 && leftoverSlices > 1){
    document.getElementById('output').innerHTML = `${people} people with ${pizzas} pizzas <br>
                                                      Each person gets ${slicePerPerson} slices of pizza.<br>
                                                      There are ${leftoverSlices} leftover slices.`
  }
  if (slicePerPerson > 1 && leftoverSlices < 2){
    document.getElementById('output').innerHTML = `${people} people with ${pizzas} pizzas <br>
                                                      Each person gets ${slicePerPerson} slices of pizza.<br>
                                                      There's a single leftover slice.`
  }
  if (slicePerPerson < 2 && leftoverSlices < 2){
    document.getElementById('output').innerHTML = `${people} people with ${pizzas} pizzas <br>
                                                      Each person gets a single slice of pizza.<br>
                                                      There's a single leftover slice.`
  }
  if (slicePerPerson < 2 && leftoverSlices > 1){
    document.getElementById('output').innerHTML = `${people} people with ${pizzas} pizzas <br>
                                                      Each person gets a single slice of pizza.<br>
                                                      There are ${leftoverSlices} leftover slices.`
  }

}
  
  
/****************************************************************************************************************************************/


function versionB(){
    document.body.innerHTML = `
        <h2 style="color: #ce0000">Exercise 8: Pizza Party</h2>
        <link rel="stylesheet" href="challenge10.css">
        <script src="ex8.js"></script>
        
        <style>
            body {
                background-color: #F3d8A6;
            }
        
            div {
                background-color: #fa7d29;
                color: #006600;
                outline-style: solid;
            }
            label{
                display: inline-block;
                clear: left;
                width: 200px;
                text-align: left;
                margin-left: 10px;
                font-weight: bold;
            }
            input {
                display: inline-block;
                background-color: #006600;
                color: white;
                margin-bottom: 1px;
                margin-top: 1px;
            }
            button {
        margin-left: 20px;
        background-color: green;
        }
        </style>
        
        <body>
            <div>
                <br>
                <label for="people">How many people?</label>
                <input type="text" id="people" oninput="numCheck()">
                <br>
                <label for="slices">How many slices does each person want?</label>
                <input type="text" id="slices" oninput="numCheck()">
                <br>
                <br>
                </div>
            <br>
            <button onclick="numCheckB()">Submit</button>
            
            
            <p id="output" style="color: #ce0000">
            </p>
        </body>
    `
}


/*
input:
  number of people
  number of pizzas
  slices per pizza
  
process:
  calculate total number of slices
  calculate number of slices per person
  calc left over
*/


function numCheckB(){
    if (isNaN(document.getElementById('people').value) || isNaN(document.getElementById('slices').value)){
      
      alert('Please enter a number')

      document.getElementById('people').value = ''
      document.getElementById('slices').value = ''
      
  } else {
    pizzaSlicerB()
}
}

function pizzaSlicerB(){
  let people = document.getElementById('people').value;
  let slices = document.getElementById('slices').value;
  
  let totalSlices = people * slices
  let leftoverSlices = totalSlices % 8
  let pizzas = (totalSlices - leftoverSlices) / 8
  
  document.getElementById('output').innerHTML = `if each of ${people} people wants ${slices} slices and assuming a full pizza has 8 slices<br>
                                                      You'd need to buy ${pizzas} pizzas, and youd have ${leftoverSlices} extra slices!`

}
  
  
  