<li>
	<inner-column>
		<exercise-detail>
			<exercise-form id="legalDrivingAge">
				<a href="#legalDrivingAge"></a>
				<h2 class="loud-voice">legalDrivingAge</h2>
				<!--  -->
				<form
					@submit.prevent="submit" 
					id="e4p" 
					autocomplete="off">
					 <!-- vue watch this scope -->
					<div class="input-field">
						<label 
							for="age16">
							Enter age to check legality:
						</label>
						<input 
							required
							id='age16' 
							type="number"
							v-model.number="age"
						>
					</div>
					<output 
						:class="{ hideOpacity: !age }">
						<p>Legel in Following places:</p>
						
						<li
						v-for="( cAge, country ) in countries">
						
							<span
							v-if="cAge <= age"
						>
							{{country[0].toUpperCase() + country.slice(1)}}
						</span>
						</li>
						
					</output>
				</form>
				<!--  -->
			</exercise-form>
		</exercise-detail>
	</inner-column>
</li>