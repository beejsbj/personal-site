class TodoApp {
	constructor() {
		this.lastId = 0;
		this.allLists = this.getData();
		this._$todoApp = document.querySelector("todo-app");
		this.renderAllLists();
		this.buttonHandler();
	}
	renderAllLists() {
		let template = "";

		this.allLists.forEach(function (list) {
			template += list.renderList();
		});

		this._$todoApp.innerHTML = template;

		this.allLists.forEach(function (list) {
			list.initData();
		});
	}

	add(name) {
		let listTemplate = {
			id: this.lastId++,
			name,
			list: [],
			dateCreated: new Date()
		};
		let list = new List(listTemplate);
		this.allLists.push(list);

		this.renderAllLists();
		this.setData();
	}

	remove(id) {
		let filtered = this.allLists.filter(function (list) {
			return list.id != id;
		});
		this.allLists = filtered;

		this.renderAllLists();
		this.setData();
	}

	buttonHandler() {
		let $addListButton = document.querySelector("button.add-list");
		window.addEventListener("click", () => {
			event.preventDefault();
			if (event.target.matches("button.add-list")) {
				let $input = event.target.closest("input-field").querySelector("input");
				(!$input.value) ? alert('please enter something') : this.add($input.value);
				$input.value = "";
			}
			if (event.target.matches("button.remove-list")) {
				let id = event.target.closest("todo-list").dataset.id;
				this.remove(id);
			}
		});
	}

	setData() {
		localStorage.TodoAppData = JSON.stringify(this.allLists);
	}

	getData() {
		let data = localStorage.TodoAppData
			? JSON.parse(localStorage.TodoAppData)
			: [];
		console.log(data)
		return data.map(function (listData) {
			return new List(listData);
		});
	}
}

class List {
	constructor(record) {
		this.name = record.name;
		this.id = record.id;
		this.list = record.list;
		this.dateCreated = record.dateCreated;
		this.lastId = 0;

		this.buttonHandler();
	}
	initData() {
		this.list = this.list.map(function (todoData) {
			return new Todo(todoData);
		});
		this.renderTodos();
	}
	add(content) {
		let todoTemplate = {
			id: this.lastId++,
			content,
			complete: false,
			dateCreated: new Date()
		};
		const todo = new Todo(todoTemplate);
		this.list.push(todo);

		this.renderTodos();
	}

	remove(id) {
		let filtered = this.list.filter(function (todo) {
			return todo.id != id;
		});
		this.list = filtered;

		this.renderTodos();
	}

	complete(id) {
		this.list.forEach(function (todo) {
			if (todo.id == id) {
				todo.toggleComplete();
			}
		});

		this.renderTodos();
	}

	renderTodos() {
		var template = "<ul>";

		this.list.forEach(function (todo) {
			template += todo.render();
		});

		template += "</ul>";
		this.$outlet = document.querySelector(`[data-id="${this.id}"] output-field`);
		this.$outlet.innerHTML = template;
	}

	renderList() {
		return `<todo-list data-id="${this.id}">
					<h2 class="notice-voice" >${this.name}</h2>
					<actions><button class="remove-list">X</button></actions>
					<form>
						<input-field>
							<label>What do you want To do?</label>
							<input minlength="1" type="text">
							<button class="add">Add</button>
						</input-field>
					</form>
					<output-field>
					</output-field>
				</todo-list>
		`;
	}

	buttonHandler() {
		window.addEventListener("click", (event) => {
			event.preventDefault();

			if (event.target.matches(`[data-id="${this.id}"] button.add`)) {
				let $input = event.target.closest("todo-list").querySelector("input");

				(!$input.value) ? alert('please enter something') : this.add($input.value);
				$input.value = "";
			}
			if (event.target.matches(`[data-id="${this.id}"] button.remove`)) {
				const id = event.target.closest("li").dataset.id;
				this.remove(id);
			}
			if (event.target.matches(`[data-id="${this.id}"] button.complete`)) {
				const id = event.target.closest("li").dataset.id;
				this.complete(id);
			}
		});
	}
}

class Todo {
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





export {
	TodoApp
}