
	<exercise-form id="numbersToNames">
		<a href="#numbersToNames"></a>
		<h2 class="loud-voice">numbersToNames</h2>
		<!--  -->
		<form
			@submit.prevent="submit" 
			id="e4p" 
			autocomplete="off">
			 <!-- vue watch this scope -->
			<div class="input-field">
				<label 
					for="monthNum">
					Enter number of month
				</label>
				<input
					max="12"
					min="1" 
					required
					id='monthNum' 
					type="number"
					v-model.number="monthNum">
			</div>
			<output 
				:class="{ hideOpacity: !monthNum }">
				<ul>
					<li v-for="lang in languages">
						{{getLangName(lang)}}: <span>{{getMonthName(monthNum, lang)}}</span>
					</li>
				</ul>
			</output>
		</form>
		<!--  -->
	</exercise-form>