import List from './List.js';

export default class TodoApp {
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








