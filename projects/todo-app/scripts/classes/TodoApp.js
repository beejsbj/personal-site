import List from "./List.js";
export default class TodoApp {
	constructor() {
		this.lastId = 0;
		this.lists = this.getData();
		this.trash = this.getTrash();
		this._$todoApp = document.querySelector( "todo-app" );
		this.renderAllLists();
		this.buttonHandler();
	}
	renderAllLists() {
		let template = "";
		this.lists.forEach( function( list ) {
			template += list.renderList();
		} );
		this._$todoApp.innerHTML = template;
		this.lists.forEach( function( list ) {
			list.initData();
		} );
	}
	findListById( id ) {
		return this.lists.find( ( list ) => {
			return id == list.id;
		} );
	}
	getUniqueID() {
		let found = this.findListById( this.lastId );
		if ( found ) {
			this.lastId++;
			console.log( this.lastId );
			this.getUniqueID();
		}
		return this.lastId;
	}
	add( name ) {
		let listTemplate = {
			id: this.getUniqueID(),
			name,
			list: [],
			trash: [],
			dateCreated: new Date(),
		};
		let list = new List( listTemplate );
		this.lists.push( list );
		this.renderAllLists();
		this.setData();
	}
	remove( id ) {
		let filtered = this.lists.filter( function( list ) {
			return list.id != id;
		} );
		let list = this.findListById( id );
		list.id = new Date();
		this.trash.push( list );
		this.lists = filtered;
		console.log( "moved to trash ", this.trash );
		this.renderAllLists();
		this.setData();
	}
	buttonHandler() {
		let $addListButton = document.querySelector( "button.add-list" );
		window.addEventListener( "click", () => {
			event.preventDefault();
			if ( event.target.matches( "button.add-list" ) ) {
				let $input = event.target.closest( "input-field" )
					.querySelector( "input" );
				!$input.value
					? alert( "please enter something" )
					: this.add( $input.value );
				$input.value = "";
			}
			if ( event.target.matches( "button.remove-list" ) ) {
				let id = event.target.closest( "todo-list" )
					.dataset.id;
				this.remove( id );
			}
			if (
				event.target.matches( "button.add" )
				|| event.target.matches( "button.remove" )
				|| event.target.matches( "button.complete" )
			) {
				this.setData();
				console.log( "saved to storage" );
			}
		} );
	}
	setData() {
		localStorage.TodoAppData = JSON.stringify( this.lists );
		localStorage.TodoAppTrash = JSON.stringify( this.trash );
	}
	getData() {
		let data = localStorage.TodoAppData
			? this.rehydrateLists( JSON.parse( localStorage.TodoAppData ) )
			: [];
		return data;
	}
	getTrash() {
		let trashData = localStorage.TodoAppTrash
			? this.rehydrateLists( JSON.parse( localStorage.TodoAppTrash ) )
			: [];
		return trashData;
	}
	rehydrateLists( data ) {
		return data.map( function( listData ) {
			return new List( listData );
		} );
	}
}