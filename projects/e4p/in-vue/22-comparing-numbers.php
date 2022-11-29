
	<exercise-form id="comparingNumbers">
		<a href="#comparingNumbers"></a>
		<h2 class="loud-voice">comparingNumbers</h2>
		<!--  -->
		<form
			@submit.prevent="submit" 
			id="e4p" 
			autocomplete="off">
			 <!-- vue watch this scope -->
			<div class="input-field">
				<label 
					for="number22">
					Enter a number
				</label>
				<input 
					required
					id='number22' 
					type="number"
					v-model.number="number">
			</div>
			<button 
				v-on:submit.prevent="submit">
				Button
			</button>
			<output 
				:class="{ hideOpacity: !output }">
				<ul class="flex-list">
					<span>[</span>
					<li v-for="number in numbers">
						<span>{{number}},</span>
					</li>
					<span>]</span>
				</ul>
				<p>Largest: <span>{{largest}}</span></p>
				<p>Smallest: <span>{{smallest}}</span></p>
				<p>Sum: <span>{{sum}}</span></p>
				<p>Mean: <span>{{mean}}</span></p>
			</output>
		</form>
		<!--  -->
	</exercise-form>