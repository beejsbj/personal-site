
	<exercise-form id="multistateSalesTaxCalculator">
		<a href="#multistateSalesTaxCalculator"></a>
		<h2 class="loud-voice">multistateSalesTaxCalculator</h2>
		<!--  -->
		<form
			@submit.prevent="submit" 
			id="e4p" 
			autocomplete="off">
			 <!-- vue watch this scope -->
			<div class="input-field">
				<label 
					for="amount20">
					Enter order amount
				</label>
				<input 
					required
					id='amount20' 
					type="number"
					min="1" 
					v-model.number="amount">
			</div>
			<div class="input-field">
				<label 
					for="state20">
					What is the state?
				</label>
				<select 
					required
					id='state20' 
					v-model="state">
				  <option 
					  v-for="state in states" 
					  :value="state"
					  >
				    {{ state.name }}
				  </option>
				</select>
			</div>
			<div class="input-field"
				:class="{ hideOpacity: !countys }">
				<label 
					for="county20">
					What is the county?
				</label>
				<select 
					v-bind:required="countys"
					id='county20' 
					v-model="county">
				  <option 
					  v-for="county in countys" 
					  :value="county"
					  >
				    {{ county.name }}
				  </option>
				</select>
			</div>
			<button 
				v-on:submit.prevent="submit">
				Button
			</button>
			<output 
				:class="{ hideOpacity: !output }">
				<p>
					Subtotal: $<span>{{amount}}</span>
				</p>
				<p>
					State tax: $<span>{{stateTax}}</span>
				</p>
				<p 
					v-if="countyTax" >
					County tax: $<span>{{countyTax}}</span>
				</p>
				<p>
					Total: $<span>{{total.toFixed(2)}}</span>
				</p>
			</output>
		</form>
		<!--  -->
	</exercise-form>