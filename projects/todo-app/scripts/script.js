import TodoApp from './classes/TodoApp.js';
var yourTodos = new TodoApp();




//dragula

function init() {
	dragula([document.querySelector('todo-app')], {
		moves: function (el, container, handle) {
    		return handle.classList.contains('handle');
 		}
	})
}

init()