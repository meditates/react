import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function UpdateBookInfo(props) {
  const [book, setBook] = useState({
    title: "",
    isbn: "",
    author: "",
    description: "",
    published_date: "",
    publisher: "",
  });

  const [file, setFile] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`http://localhost:8082/api/books/${id}`)
      .then((res) => {
        setBook({
          title: res.data.title,
          isbn: res.data.isbn,
          author: res.data.author,
          description: res.data.description,
          published_date: res.data.published_date,
          publisher: res.data.publisher,
        });
      })
      .catch((err) => {
        console.log("Error from UpdateBookInfo");
      });
  }, [id]);

  const onChange = (e) => {
    setBook({ ...book, [e.target.name]: e.target.value });
  };

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", book.title);
    formData.append("isbn", book.isbn);
    formData.append("author", book.author);
    formData.append("description", book.description);
    formData.append("published_date", book.published_date);
    formData.append("publisher", book.publisher);
    if (file) {
      formData.append("image", file);
    }
    axios
      .put(`http://localhost:8082/api/books/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        navigate(`/show-book/${id}`);
      })
      .catch((err) => {
        console.log("Error in UpdateBookInfo!");
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center py-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-blue-500 hover:underline">
            Show Book List
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-2">
          Edit Book
        </h1>
        <p className="text-center text-gray-500 mb-6">Update Book's Info</p>
        <form noValidate onSubmit={onSubmit} encType="multipart/form-data">
          <div className="mb-4">
            <label htmlFor="title" className="block mb-1 font-medium">
              Title
            </label>
            <input
              type="text"
              placeholder="Title of the Book"
              name="title"
              className="w-full border rounded px-3 py-2"
              value={book.title}
              onChange={onChange}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="isbn" className="block mb-1 font-medium">
              ISBN
            </label>
            <input
              type="text"
              placeholder="ISBN"
              name="isbn"
              className="w-full border rounded px-3 py-2"
              value={book.isbn}
              onChange={onChange}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="author" className="block mb-1 font-medium">
              Author
            </label>
            <input
              type="text"
              placeholder="Author"
              name="author"
              className="w-full border rounded px-3 py-2"
              value={book.author}
              onChange={onChange}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block mb-1 font-medium">
              Description
            </label>
            <textarea
              type="text"
              placeholder="Description of the Book"
              name="description"
              className="w-full border rounded px-3 py-2"
              value={book.description}
              onChange={onChange}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="published_date" className="block mb-1 font-medium">
              Published Date
            </label>
            <input
              type="text"
              placeholder="Published Date"
              name="published_date"
              className="w-full border rounded px-3 py-2"
              value={book.published_date}
              onChange={onChange}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="publisher" className="block mb-1 font-medium">
              Publisher
            </label>
            <input
              type="text"
              placeholder="Publisher of the Book"
              name="publisher"
              className="w-full border rounded px-3 py-2"
              value={book.publisher}
              onChange={onChange}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="image" className="block mb-1 font-medium">
              Book Image
            </label>
            <div className="mb-2">
              <img
                src={book.image ? `http://localhost:8082${book.image}` : "/newbooks.jpeg"}
                alt="book"
                className="max-w-[200px] max-h-[200px] rounded shadow"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              className="w-full border rounded px-3 py-2"
              onChange={onFileChange}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded shadow transition"
          >
            Update Book
          </button>
        </form>
      </div>
    </div>
  );
}

export default UpdateBookInfo;
