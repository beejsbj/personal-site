
	<exercise-form id="temperatureConverter">
		<a href="#temperatureConverter"></a>
		<h2 class="loud-voice">temperatureConverter</h2>
		<!--  -->
		<form
			@submit.prevent="submit" 
			id="e4p" 
			autocomplete="off">
			 <!-- vue watch this scope -->
			 <div class="radio-list">
		        <div class="input-field">
		            <input 
		            	required
		                id="celcius" 
		                type="radio" 
		                value="celcius"
		                v-model="unit"
		            >
		            <label for="celcius">Celcius</label>
		        </div> 
		        <div class="input-field">
		            <input 
		            	required
		                id="farenheit" 
		                type="radio" 
		                value="farenheit"
		                v-model="unit"
		            >
		            <label for="farenheit">Farenheit</label>
		        </div>
		         <div class="input-field">
		            <input 
		            	required
		                id="kelvin" 
		                type="radio" 
		                value="kelvin"
		                v-model="unit"
		            >
		            <label for="kelvin">Kelvin</label>
		        </div>     
		    </div>
			<div class="input-field">
				<label 
					for="temperature">
					Enter the temperature in {{unit}}
				</label>
				<input 
					required
					id='temperature' 
					type="number"
					v-model.number="temperature">
			</div>
			<output 
				:class="{ hideOpacity: !temperature }">
				<p>
					Celcius: <span>{{ toCelcius.toFixed(2) }}</span>
				</p>
				<p>
					Farenheit: <span>{{ toFarenheit.toFixed(2) }}</span>
				</p>
				<p>
					Kelvin: <span>{{ toKelvin.toFixed(2) }}</span>
				</p>
			</output>
		</form>
		<!--  -->
	</exercise-form>