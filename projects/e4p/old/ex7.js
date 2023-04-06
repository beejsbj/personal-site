
/*
input:
  length: 15; 30
  width: 20; 50
process:
  calculate area
  convert into metric,
expected output:
  300ft ; 1500
  27.871m; 139.355
  */

  const conversionFactor = 0.09290304;


  function numCheck(){
    
    if (isNaN(document.getElementById('length').value) || isNaN(document.getElementById('width').value)){
      alert('Please enter a number')
      document.getElementById('length').value = ''
      document.getElementById('width').value = ''
    } else {
      
      if (document.getElementById('meter').checked){
        challenge7meter()
      } else if (document.getElementById('feet').checked){
        challenge7feet()
      }
    }
  }
    
  function challenge7feet(){
    
    let length = document.getElementById('length').value;
    let width = document.getElementById('width').value;
    
    
  
    
    let areaInFt = length * width;
    let areaInMet = areaInFt * conversionFactor;
  
    
    document.getElementById('output').innerHTML = `
    You entered dimensions of ${length} feet by ${width} feet.
    <br>
    The area is ${areaInFt} square feet <br>
    and ${areaInMet} square meters`
    
  }
  
  function challenge7meter(){
    
    let length = document.getElementById('length').value;
    let width = document.getElementById('width').value;
    
  
    
    let areaInMet = length * width;
    let areaInFt = areaInMet / conversionFactor
    
    document.getElementById('output').innerHTML = `
    You entered dimensions of ${length} meter by ${width} meter.
    <br>
    The area is ${areaInMet} square meters <br>
    and ${areaInFt} square feet`
    
  }
  