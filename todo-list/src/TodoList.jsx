import { useState } from "react";
import { TodoItem } from "./TodoItem";
export function TodoList({ todos, handleToggle, handleDelete }) {
  return (
    <ul className="list">
      {todos.length === 0 && "No Todos"}
      {todos.map((todo) => {
        return (
          <TodoItem
            {...todo}
            key={todo.id}
            handleToggle={handleToggle}
            handleDelete={handleDelete}
          />
        );
      })}
    </ul>
  );
}
