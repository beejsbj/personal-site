<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[[XXXXXXXXXXXXXXXXX]]">
    <meta property="og:image" content= "[XXXXXXXXX]">

    <link rel="stylesheet" href="css/style.css">

    <title>Self Checkout</title>


    <style>
        item-field {
            display: flex;
            gap: 25px;
            align-items: center;
            justify-content: space-between;
        }

        item-field > .input-field {
            flex-basis: 80%;
        }

        h2 {
            font-size: 1.2rem;
            color: white;
            font-family: "Expose";
            opacity: 0.7;
        }


        .output-field {
            text-align: left;
        }
    </style>
</head>




    
<?php
function showPageErrors() {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}



// showPageErrors();



$price1 = 0;
$quantity1 = 0;
$price2 = 0;
$quantity2 = 0;
$price3 = 0;
$quantity3 = 0;
$taxRate = 0.055;



$class = "hide";
 // $class = "output-field";




if (isset($_POST['submitted'])){
    if (
        (isset($_POST['price1'])) && (isset($_POST['quantity1'])) &&
        (isset($_POST['price2'])) && (isset($_POST['quantity2'])) &&
        (isset($_POST['price3'])) && (isset($_POST['quantity3']))
    ) {


        if (
            ($_POST['price1'] != '') && ($_POST['quantity1'] != '') &&
            ($_POST['price2'] != '') && ($_POST['quantity2'] != '') &&
            ($_POST['price3'] != '') && ($_POST['quantity3'] != '')
        ) {

            $price1 = $_POST['price1'];
            $quantity1 = $_POST['quantity1'];

            $price2 = $_POST['price2'];
            $quantity2 = $_POST['quantity2'];

            $price3 = $_POST['price3'];
            $quantity3 = $_POST['quantity3'];


            $subTotal = ($price1 * $quantity1) + ($price2 * $quantity2) + ($price3 * $quantity3);
            $subTotal = round(floatval($subTotal), 2);
            $tax = round($taxRate * $subTotal, 2);
            $total = $tax + $subTotal;




            $output = "
       Enter the price of item 1: <span>$price1</span> <br>
       Enter the quantity of item 1: <span>$quantity1</span> <br>
       Enter the price of item 2: <span>$price2</span> <br>
       Enter the quantity of item 2: <span>$quantity2</span> <br>
       Enter the price of item 3: <span>$price3</span> <br>
       Enter the quantity of item 3: <span>$quantity3</span> <br>
       Subtotal: <span>$subTotal</span> <br>
       Tax: <span>$tax</span> <br>
       Total: <span>$total</span>";

            $class = "output-field";

        }
    }


           
           


}




?>

<body>
    <header>
        <div class="inner-column">
            <a href="index.php">⬅</a>
            <h1>Self Checkout</h1>
        </div>
    </header>
    <main>
        <div class="inner-column">

            <form method="POST">

                <item-field>
                    <h2>1</h2>
                    <div class="input-field">
                    <input id="priceid1" type="number" name="price1" placeholder="Price?" value="">
                    <label for="priceid1">Enter Price</label>
                </div>
                <div class="input-field">
                    <input id="quantityid1" type="number" name="quantity1" placeholder="Quantity??" value="">
                    <label for="quantityid1">Enter Quantity</label>
                </div>
                </item-field>
                <item-field>
                    <h2>2</h2>
                    <div class="input-field">
                    <input id="priceid2" type="number" name="price2" placeholder="Price?" value="">
                    <label for="priceid2">Enter Price</label>
                </div>
                <div class="input-field">
                    <input id="quantityid2" type="number" name="quantity2" placeholder="Quantity??" value="">
                    <label for="quantityid2">Enter Quantity</label>
                </div>
                </item-field>
                <item-field>
                    <h2>3</h2>
                    <div class="input-field">
                    <input id="priceid3" type="number" name="price3" placeholder="Price?" value="">
                    <label for="priceid3">Enter Price</label>
                </div>
                <div class="input-field">
                    <input id="quantityid3" type="number" name="quantity3" placeholder="Quantity??" value="">
                    <label for="quantityid3">Enter Quantity</label>
                </div>
                </item-field>


                <button type="submit" name="submitted">
                    Checkout
                </button>


                <div class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
                
            </form>
        </div>
    </main>


</body>
</html>

















































