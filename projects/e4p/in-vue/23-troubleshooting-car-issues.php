
	<exercise-form id="troubleshootingCarIssues">
		<a href="#troubleshootingCarIssues"></a>
		<h2 class="loud-voice">troubleshootingCarIssues</h2>
		<!--  -->
		<form
			@submit.prevent="submit" 
			id="e4p" 
			autocomplete="off">
			 <!-- vue watch this scope -->
			<div class="input-field">
				<label 
					for="">
					
				</label>
				<input 
					required
					id='' 
					type="number"
					v-modelnumber="">
			</div>
			<div class="input-field">
				<label 
					for="">
					
				</label>
				<input 
					required
					id='' 
					type="number"
					v-modelnumber="">
			</div>
			<button 
				v-on:submit.prevent="submit">
				Button
			</button>
			<output 
				:class="{ hideOpacity: !output }">
				<p>{{output}}</p>
			</output>
		</form>
		<!--  -->
	</exercise-form>