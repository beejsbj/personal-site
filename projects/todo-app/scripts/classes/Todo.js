export default class Todo {
	constructor(record) {
		this.id = record.id;
		this.content = record.content;
		this.complete = record.complete;
		this.dateCreated = record.dateCreated;
	}

	toggleComplete() {
		this.complete = !this.complete;
	}

	render() {
		return `
			<li data-id ="${this.id}">
				<todo-card class=${this.complete ? "complete" : ""}>
					<actions>
						<button class="complete"></button>
						<button class="remove">
							<picture>
								<svg viewBox="0 0 50 50" preserveAspectRatio="xMidYMid" width="50" height="50">
								   <line x1="0" y1="0" x2="50" y2="50" />
								   <line x1="50" y1="0" x2="0" y2="50" />
								</svg>
							</picture>
						</button>	
					</actions>
					<h3 class="calm-voice" >${this.content}</h3>	
				</todo-card>
			</li>
		`;
	}
}