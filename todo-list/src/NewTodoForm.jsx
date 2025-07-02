import { useState } from "react"

export function NewTodoForm({handleAddTodo}) {

    const [newItem, setNewItem] = useState("")

    function handleSubmit(e) {
        e.preventDefault()
        if (newItem === "") return
        handleAddTodo(newItem)
        setNewItem("")
      }
  return (
    <form className="new-item-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="item">New Item</label>
        <input value={newItem} type="text" id="item" placeholder="New Item" onChange={e => setNewItem(e.target.value)} />
      </div>
      <button className="btn">Add</button>
      <div className="form-row"></div>
    </form>
  )
}
