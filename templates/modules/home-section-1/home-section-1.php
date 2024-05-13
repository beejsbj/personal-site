<home-section class="one">

	<h1 class="booming-voice">
		Hello
	</h1>

	<h2 class="booming-voice">
		<picture>
			<img src="images/burooj1.jpg" alt="">
		</picture>
		<span>Burooj here!</span>
	</h2>

	<div class="dev-signer">
		<span class="brace">{</span>
		<span class="notice-voice">Web Dev/signer</span>
		<span class="brace">}</span>
	</div>


	<picture class="arrow">
		<svg width="112px" height="492px" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-miterlimit:5;">
			<g transform="matrix(1,0,0,1,-44620.4,-20329.5)">
				<g transform="matrix(-0.341833,-5.09942e-17,-1.2642e-16,-1.87974,60171,59222.2)">
					<g transform="matrix(-2.9254,7.93614e-17,1.96745e-16,-0.531989,45491.9,20690.5)">
						<path d="M74.209,448.497C72.441,454.97 65.749,458.79 59.276,457.021C52.803,455.253 48.983,448.562 50.751,442.088C52.52,435.615 59.211,431.795 65.685,433.564C72.158,435.332 75.978,442.024 74.209,448.497Z" style="fill:rgb(124,38,33);" />
						<path d="M55.808,34.39C55.808,34.39 78.184,71.151 71.974,116.321C67.836,146.416 34.162,180.682 34.391,208.691C34.62,236.596 71.334,270.66 76.024,314.552C80.989,361.009 70.982,411.646 64.403,438.255" style="fill:none;stroke:rgb(124,38,33);stroke-width:4.05px;" />
					</g>
				</g>
			</g>
		</svg>

	</picture>





</home-section>


<style>
	.home .page-title {
		display: none;
	}

	home-section.one h1 {
		grid-column: 1/8;
		font-size: var(--step-6);
	}





	home-section.one h2 {
		grid-column: 2/-1;
		display: grid;
		grid-template-columns: 0.3fr 1fr;
		align-items: center;
		gap: var(--space-s);
	}

	home-section.one h2 picture {
		border-radius: 50%;
	}




	.dev-signer {
		grid-column: 1/5;

		display: flex;
		align-items: center;
		gap: var(--space-2xs);
		font-family: var(--font1);
		font-size: var(--step-2);
	}

	.dev-signer .brace {

		color: var(--color);
		font-size: var(--step-4);
		font-weight: 700;

	}

	home-section.one graphic-diptych {
		display: grid;
		grid-template-columns: 1fr 0.8fr;
	}

	home-section.one .arrow {
		border-radius: 50%;
		position: absolute;
		grid-row: 3;
		grid-column: 10;
		bottom: -30%;

		@media (max-width: 768px) {
			display: none;
		}
	}
</style>