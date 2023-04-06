    
    

var users = {};
const bcrypt = require('bcryptjs');
const saltRounds = 10;


function main(ele){
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var id = ele.id;

    if (id == 'signup'){

        signUp(username, password)

        document.getElementById('output').innerHTML =  `You have successfully signed up`
        
    }

    if (id == 'signin'){

        if (signIn(username, password)){
            document.getElementById('output').innerHTML =  `You have signed in!`
        } else {
            document.getElementById('output').innerHTML =  `Your username or password is incorrect`
        }
    }

}




function signUp(username, password){

    bcrypt.hash(password, saltRounds).then(function(hash) {
        // Store hash in your password DB.
        users[username] = hash;
        console.log(users)
        //console.log(bcrypt.compareSync(password, hash))
    });
}


function signIn(username, password){

    bcrypt.hash(password, saltRounds).then(function(hash) {
        // Store hash in your password DB.
        bcrypt.compareSync(users[username], hash)
    });
}
