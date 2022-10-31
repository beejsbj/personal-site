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
					<h3 class="calm-voice" >${this.content}</h3>
					<actions>
						<button class="remove">Delete</button>
						<button class="complete">Done</button>
					</actions>
			</todo-card>
			</li>
		`;
	}
}