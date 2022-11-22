
<exercise-form id="bloodAlcoholCalculator">
	<a href="#bloodAlcoholCalculator"></a>
	<h2 class="loud-voice">bloodAlcoholCalculator</h2>
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
	                id="male" 
	                type="radio" 
	                value="male"
	                v-model="gender"
	            >
	            <label for="male">Male</label>
	        </div> 
	        <div class="input-field">
	            <input 
	            	required
	                id="female" 
	                type="radio" 
	                value="female"
	                v-model="gender"
	            >
	            <label for="female">Female</label>
	        </div>   
	    </div>
		<div class="input-field">
			<label 
				for="weight17">
				Enter your weight in pounds
			</label>
			<input 
				required
				id='weight17' 
				type="number"
				v-model.number="weight">
		</div>
		<div class="input-field">
			<label 
				for="number17">
				Enter number of drinks:
			</label>
			<input 
				required
				id='number17' 
				type="number"
				v-model.number="number">
		</div>
		<div class="input-field">
			<label 
				for="time17">
				Enter number of hours since last drink
			</label>
			<input 
				required
				id='time17' 
				type="number"
				v-model.number="time">
		</div>
		<button 
			v-on:submit.prevent="submit">
			Button
		</button>
		<output 
			:class="{ hideOpacity: !output }">
			<p>Your BAC is: <span>{{bac.toFixed(2)}}</span></p>
			<p>{{isLegal}}</p>
		</output>
	</form>
	<!--  -->
</exercise-form>
