<style>
	body {
/*		padding-top: 0px;*/
	}

	#selfCheckout output {
		padding: 0;
	}

	.hideOpacity {
		opacity: 0;
		transition: 0.2s;
	}

	inner-column {
		padding: 70px 10px;
	}
	exercise-detail {
		grid-template-columns: 1fr;
	}

	exercise-form {
		position: relative;
	}
	li {
		/* 	min-height: 500px; */
	}
	li:nth-of-type(even) {
		background-color: hsla(45, 10%, 70%, 1);
	}

	exercise-form > a {
		--size: clamp(2.25rem, calc(1.66rem + 2.93vw), 3rem);
		content: "";
		position: absolute;
		top: 12px;
		left: -80px;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background-color: var(--dark-highlight);
		transition: 0.2s;
	}

	exercise-form > a:hover {
		background-color: var(--dark-color);
		transform: scale(1.1);
	}

	sup {
		vertical-align: super;
		font-size: smaller;
	}

	/* self checkout */
	item-field {
		gap: 25px;
		/*align-items: start;*/
	}
	.default-theme exercise-form h4 {
		display: none;
	}

	@media (min-width: 750px) {
		item-field {
			grid-template-columns: 1fr 1fr;
			justify-content: space-between;
		}
	}

	output {
		text-align: left;
	}

	.buttons {
		display: flex;
		/* 	gap: 10px; */
		justify-content: space-around;
		justify-self: stretch;
	}

	table * {
		/* 	border: 1px solid black; */
	}

	tr {
		display: grid;
		grid-template-columns: 0.8fr 1fr 1fr 1fr;
		gap: 5px;
	}
	tr > * {
		padding: 10px;
	}

	thead,
	tfoot {
		background-color: var(--light-color);
	}

	tfoot {
		background-color: var(--light-highlight);
	}

	tbody tr:nth-of-type(even) {
		background-color: var(--paper);
	}

</style>
<ul>
	<li>
		<inner-column>
			<exercise-detail>

				<exercise-form id="saying-hello">
					<a href="#saying-hello"></a>
					<h2 class="loud-voice">Saying Hello</h2>
					<!--  -->
					<form autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="name">What is your Name</label>
							<input id='name' v-model="name">
						</div>
						<button v-on:click.prevent="submit">submit</button>
						<output :class="{ hideOpacity: !output }">
							<p>{{output}}</p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>

				<exercise-form id="char-count">
					<a href="#char-count"></a>
					<h2 class="loud-voice">Counting Characters</h2>
					<!--  -->
					<form autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="string">Type in your String</label>
							<input id='string' v-model="string">
						</div>
						<output :class="{ hideOpacity: !length }">
							<p>Characater Count: <span>{{length}}</span></p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>

				<exercise-form id="printing-quotes">
					<a href="#printing-quotes"></a>
					<h2 class="loud-voice">Printing Quotes</h2>
					<!--  -->
					<form autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="quote">what was said?</label>
							<input id='quote' v-model="quote">
						</div>
						<div class="input-field">
							<label for="author">Who said it?</label>
							<input id='author' v-model="author">
						</div>
						<button v-on:click.prevent="submit">Print</button>
						<output :class="{ hideOpacity: !output }">
							<p><span>{{author}}</span> said <span><em>"{{quote}}"</em></span></p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="mad-lib">
					<a href="#mad-lib"></a>
					<h2 class="loud-voice">Mad Lib</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="noun">Enter a Noun</label>
							<input id='noun' v-model="noun">
						</div>
						<div class="input-field">
							<label for="verb">Enter a Verb</label>
							<input id='verb' v-model="verb">
						</div>
						<div class="input-field">
							<label for="adjective">Enter a Adjective</label>
							<input id='adjective' v-model="adjective">
						</div>
						<div class="input-field">
							<label for="adverb">Enter a Adverb</label>
							<input id='adverb' v-model="adverb">
						</div>

						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p>Do you <span>{{verb}}</span> your <span>{{adjective}}</span> <span>{{noun}}</span> <span>{{adverb}}</span>? That's hilarious!</p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="simpleMath">
					<a href="#simpleMath"></a>
					<h2 class="loud-voice">Simple Math</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="first">Enter first number?</label>
							<input type="number" id='first' v-model.number="first">
						</div>
						<div class="input-field">
							<label for="second">Enter second number?</label>
							<input type="number" id='second' v-model.number="second">
						</div>
						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p>{{first}} + {{second}} = {{sum}}</p>
							<p>{{first}} - {{second}} = {{difference}}</p>
							<p>{{first}} * {{second}} = {{product}}</p>
							<p>{{first}} ÷ {{second}} = {{quotient}}</p>
							<p>{{first}} % {{second}} = {{modulo}}</p>
							<p>{{first}} <sup>{{second}}</sup> = {{power}}</p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="retirementCalculator">
					<a href="#retirementCalculator"></a>
					<h2 class="loud-voice">Retirement Calculator</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="currAge">What is your current age?</label>
							<input type="number" id='currAge' v-model="currAge">
						</div>
						<div class="input-field">
							<label for="retireAge">At what age would you like to retire?</label>
							<input type="number" id='retireAge' v-model="retireAge">
						</div>
						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p>{{output}}</p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="areaOfARectangularRoom">
					<a href="#areaOfARectangularRoom"></a>
					<h2 class="loud-voice">Area of a Rectangular Room</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="radio-list">
							<input type="radio" id="feet" value="feet" v-model="unit" />
							<label for="feet">Feet</label>

							<input type="radio" id="meter" value="meter" v-model="unit" />
							<label for="meter">Meter</label>
						</div>
						<div class="input-field">
							<label for="length">What is the length of the room in {{unit}}?</label>
							<input id='length' type="number" min="1" v-model.number="length">
						</div>
						<div class="input-field">
							<label for="width">What is the width of the room in {{unit}}?</label>
							<input id='width' type="number" min="1" v-model.number="width">
						</div>
						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p>You entered dimensions of {{length}} {{unit}} by {{width}} {{unit}}.</p>
							<p>The area is</p>
							<p>{{inFeet}} square feet</p>
							<p>{{inMeter}} square meters</p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="pizzaParty">
					<a href="#pizzaParty"></a>
					<h2 class="loud-voice">Pizza Party</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="people">How many people are there?</label>
							<input type="number" min="2" id='people' v-model.number="people">
						</div>
						<div class="input-field">
							<label for="pizzas">How many pizzas do you have?</label>
							<input type="number" min="1" id='pizzas' v-model.number="pizzas">
						</div>
						<div class="input-field">
							<label for="slices">How many slices does each pizza have?</label>
							<input type="number" min="3" id='slices' v-model.number="slices">
						</div>
						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p>{{people}} people with {{pizzas}} {{pizza}}</p>
							<p>Each person gets {{getSlices}} {{slice}} of pizza.</p>
							<p>{{leftovers}}</p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="paintCalculator">
					<a href="#paintCalculator"></a>
					<h2 class="loud-voice">paintCalculator</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="radio-list">
							<input type="radio" id="rectangle" value="rectangle" v-model="shape" />
							<label for="rectangle">Rectangular</label>

							<input type="radio" id="round" value="round" v-model="shape" />
							<label for="round">Round</label>
						</div>
						<div :class="{ hide: isRound, 'input-field': !isRound }">
							<label for="lengthPaint">Enter the length of room in feet</label>
							<input id='lengthPaint' v-model="lengthPaint">
						</div>
						<div :class="{ hide: isRound, 'input-field': !isRound }">
							<label for="widthPaint">Enter the width of room in feet</label>
							<input id='widthPaint' v-model="widthPaint">
						</div>
						<div :class="{ hide: !isRound, 'input-field': isRound }">
							<label for="radiusPaint">Enter the radius of room in feet</label>
							<input id='radiusPaint' v-model="radiusPaint">
						</div>
						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p class="solid-voice">Area of cieling <span>(square feet)</span>: </p>
							<p><span>{{area}}</span></p>
							<p class="solid-voice">
								Amount of Paint needed <span>({{gallon}})</span>:
							</p>
							<p> <span>{{gallons}}</span> </p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="selfCheckout">
					<a href="#selfCheckout"></a>
					<h2 class="loud-voice">Self Checkout</h2>
					<!--  -->
					<form id="e4p" autocomplete="off">
						<!-- vue watch this scope -->
						<div class="input-field">
							<label for="price">Enter Price of item</label>
							<input type="number" id='price' v-model.number="price" ref="price">
						</div>
						<div class="input-field">
							<label for="quantity">Enter Quantity of item</label>
							<input type="number" id='quantity' v-model.number="quantity">
						</div>
						<div class="buttons">
							<button v-on:click.prevent="add">Add Item</button>
							<button v-on:click.prevent="submit">Checkout</button>
						</div>
						<output :class="{ hideOpacity: !items[0] }">
							<table class="styled-table">
								<thead>
									<tr>
										<th>Item</th>
										<th>Price</th>
										<th>Quantity</th>
										<th>Total</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(item, i) in items">
										<td>{{i + 1}}</td>
										<td>${{item.price}}</td>
										<td>{{item.quantity}}</td>
										<td>${{item.total}}</td>
									</tr>
								</tbody>
								<tfoot :class="{ hideOpacity: !output }">
									<tr>
										<td></td>
										<td></td>
										<td>Total: </td>
										<td>${{total}}</td>
									</tr>
								</tfoot>
							</table>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
	<li>
		<inner-column>
			<exercise-detail>
				<exercise-form id="currencyConversion">
					<a href="#currencyConversion"></a>
					<h2 class="loud-voice">Currency Conversion</h2>
					<!--  -->
					<form id="e4p" autocomplete="off"> <!-- vue watch this scope -->
						<div class="input-field">
							<label for="from">How many euros are you exchanging?</label>
							<input id='from' v-model="from">
						</div>
						<div class="input-field">
							<label for="rate">What is the exchange rate?</label>
							<input id='rate' v-model="rate">
						</div>
						<button v-on:click.prevent="submit">Button</button>
						<output :class="{ hideOpacity: !output }">
							<p class="solid-voice">Amount in USD</p>
							<p><span>{{result}}</span></p>
						</output>
					</form>
					<!--  -->
				</exercise-form>
			</exercise-detail>
		</inner-column>
	</li>
</ul>
