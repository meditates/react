import "./styles.css";
import { useState, useEffect } from "react";
import { NewTodoForm } from "./NewTodoForm";
import { TodoList } from "./TodoList";
export default function App() {
  const [todos, setTodos] = useState(() => {
    const localValue = localStorage.getItem("ITEMS");
    if (localValue == null) return [];
    return JSON.parse(localValue);
  });

  useEffect(() => {
    localStorage.setItem("ITEMS", JSON.stringify(todos));
  }, [todos]);

  function handleAddTodo(title) {
    setTodos((currentTodos) => {
      return [
        ...currentTodos,
        { id: crypto.randomUUID(), title: title, completed: false },
      ];
    });
  }
  function handleToggle(id, checked) {
    setTodos((currentTodos) => {
      return currentTodos.map((todo) => {
        if (todo.id === id) {
          return { ...todo, completed: checked };
        }
        return todo;
      });
    });
  }
  function handleDelete(id, completed) {
    setTodos((currentTodos) => {
      return currentTodos.filter((todo) => todo.id !== id);
    });
  }
  return (
    <>
      <NewTodoForm handleAddTodo={handleAddTodo} />
      <h1 className="header">Todo List</h1>
      <TodoList
        todos={todos}
        handleToggle={handleToggle}
        handleDelete={handleDelete}
      />
    </>
  );
}
