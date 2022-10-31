

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


        .output-field {
            text-align: left;
        }
    </style>





    
<?php
 







$price1 = '';
$quantity1 = '';
$price2 = '';
$quantity2 = '';
$price3 = '';
$quantity3 = '';
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



            <form id="e4p" method="POST">

                <item-field>
                    <h2 class="whisper-voice">1</h2>
                    <div class="input-field">
                    <input id="priceid1" type="text" class="text-number-input" required name="price1" placeholder="Price?" value="<?=$price1?>">
                    <label for="priceid1">Enter Price</label>
                </div>
                <div class="input-field">
                    <input id="quantityid1" type="text" class="text-number-input" required name="quantity1" placeholder="Quantity??" value="<?=$quantity1?>">
                    <label for="quantityid1">Enter Quantity</label>
                </div>
                </item-field>
                <item-field>
                    <h2 class="whisper-voice">2</h2>
                    <div class="input-field">
                    <input id="priceid2" type="text" class="text-number-input" required name="price2" placeholder="Price?" value="<?=$price2?>">
                    <label for="priceid2">Enter Price</label>
                </div>
                <div class="input-field">
                    <input id="quantityid2" type="text" class="text-number-input" required name="quantity2" placeholder="Quantity??" value="<?=$quantity2?>">
                    <label for="quantityid2">Enter Quantity</label>
                </div>
                </item-field>
                <item-field>
                    <h2 class="whisper-voice">3</h2>
                    <div class="input-field">
                    <input id="priceid3" type="text" class="text-number-input" required name="price3" placeholder="Price?" value="<?=$price3?>">
                    <label for="priceid3">Enter Price</label>
                </div>
                <div class="input-field">
                    <input id="quantityid3" type="text" class="text-number-input" required name="quantity3" placeholder="Quantity??" value="<?=$quantity3?>">
                    <label for="quantityid3">Enter Quantity</label>
                </div>
                </item-field>


                <button type="submit" name="submitted">
                    Checkout
                </button>


                <div id="e4p-output" class="<?=$class?>">
                    <p>
                        <?=$output?>
                    </p>
                </div>
                
            </form>











































