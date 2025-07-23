import { useState, useEffect } from "react";
import axios from "axios";
import deleteIcon from "./assets/delete.svg";

const BASE_URL = "http://localhost:5000/api";

function App() {
  const [todos, setTodos] = useState(null);
  const [todo, setTodo] = useState("");

  useEffect(() => {
    getTodos();
  }, []);

  const getTodos = () => {
    axios
      .get(`${BASE_URL}/todos`)
      .then((res) => setTodos(res.data))
      .catch((err) => console.error(err));
  };

  const handleAddTodo = () => {
    axios
      .post(`${BASE_URL}/todo/new`, {
        title: todo,
      })
      .then((res) => {
        setTodos([...todos, res.data]);
        setTodo("");
      })
      .catch((err) => console.error(err));
  };

  const handleDeleteTodo = (id) => {
    axios
      .delete(`${BASE_URL}/todo/delete/${id}`)
      .then((res) =>
        setTodos(todos.filter((todo) => todo._id !== res.data._id))
      )
      .catch((err) => console.error(err));
  };

  const handleTodoClick = (id) => {
    axios
      .get(`${BASE_URL}/todo/toggleStatus/${id}`)
      .then((res) => getTodos())
      .catch((err) => console.error(err));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <div className="flex items-center mb-8 w-full max-w-md">
        <input
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={todo}
          onChange={(e) => setTodo(e.target.value)}
          placeholder="ADD a New Todo"
        />
        <div
          className="bg-blue-500 text-white px-4 py-2 rounded-r cursor-pointer hover:bg-blue-600 transition"
          onClick={handleAddTodo}
        >
          +
        </div>
      </div>
      <div className="w-full max-w-md space-y-2">
        {!todos || !todos.length ? (
          <h3 className="text-center text-gray-500">No Todo Data !!!</h3>
        ) : (
          todos.map((todo) => (
            <div
              className="flex items-center justify-between bg-white p-4 rounded shadow"
              key={todo._id}
            >
              <div
                onClick={() => handleTodoClick(todo._id)}
                className={
                  (todo.complete ? "line-through text-blue-400 " : "") +
                  "cursor-pointer flex-1 text-lg"
                }
                id="todo-title"
              >
                {todo.title}
              </div>
              <div
                className="ml-4 cursor-pointer hover:scale-110 transition"
                onClick={() => handleDeleteTodo(todo._id)}
              >
                <img src={deleteIcon} alt="delete" height="20px" width="20px" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
