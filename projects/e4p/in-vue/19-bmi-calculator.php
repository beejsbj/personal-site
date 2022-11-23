
	<exercise-form id="bmiCalculator">
		<a href="#bmiCalculator"></a>
		<h2 class="loud-voice">bmiCalculator</h2>
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
		                id="metric" 
		                type="radio" 
		                value="metric"
		                v-model="unit"
		            >
		            <label for="metric">Metric</label>
		        </div> 
		        <div class="input-field">
		            <input 
		            	required
		                id="imperial" 
		                type="radio" 
		                value="imperial"
		                v-model="unit"
		            >
		            <label for="imperial">Imperial</label>
		        </div> 
		    </div>
			<div class="input-field">
				<label 
					for="weight19">
					Enter your weight in {{weightUnit}}
				</label>
				<input 
					required
					id='weight19' 
					type="number"
					v-model.number="weight">
			</div>
			<div class="input-field">
				<label 
					for="height19">
					Enter your height in {{heightUnit}}
				</label>
				<input 
					required
					id='height19' 
					type="number"
					v-model.number="height">
			</div>
			<output 
				:class="{ hideOpacity: !inputs }">
				<p>BMI: {{bmi.toFixed(2)}}</p>
				<p :style="{ color: color }">{{output}}.</p>
			</output>
		</form>
		<!--  -->
	</exercise-form>