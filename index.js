'use strict'

const { ipcRenderer } = require('electron');

const deleteTodo = (e) => {
    ipcRenderer.send('delete-todo', e.target.textContent)
}

document.getElementById('createTodoBtn').addEventListener('click', () => {
    ipcRenderer.send('add-todo-window')
})

ipcRenderer.on('todos', (event, todos) => {
    const todoList = document.getElementById("todoList")

    const todoItems = todos.reduce((html, todo) => {
        html += `<li class="todo-item">${todo}</li>`

        return html
    }, '')

    todoList.innerHTML = todoItems

    todoList.querySelectorAll('.todo-item').forEach(item => {
        item.addEventListener('click', deleteTodo)
    })

})