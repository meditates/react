import { useState } from "react";
export function TodoItem({ completed, id, title, handleToggle, handleDelete }) {
  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => handleToggle(id, e.target.checked)}
        />
        <span>{title}</span>
      </label>
      <button className="btn btn-danger " onClick={() => handleDelete(id)}>
        Delete
      </button>
    </li>
  );
}
