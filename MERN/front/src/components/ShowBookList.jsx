import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import BookCard from "./BookCard";
import axios from "axios";

function ShowBookList() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const fetchBooks = () => {
      axios
        .get("http://localhost:8082/api/books")
        .then((res) => setBooks(res.data))
        .catch(() => console.log("Error from ShowBookList"));
    };
    fetchBooks();
    const handler = () => fetchBooks();
    window.addEventListener('books:changed', handler);
    return () => window.removeEventListener('books:changed', handler);
  }, []);

  const bookList =
    books.length === 0
      ? "there is no book record!"
      : books.map((book, k) => <BookCard book={book} key={k} />);

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-500 to-pink-500 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-center text-white mb-6">
            Books List
          </h2>
          <div className="flex justify-end mb-4">
            <Link
              to="/create-book"
              className="px-4 py-2 rounded border bg-yellow-500 text-white hover:bg-yellow-400 hover:text-white transition"
            >
              + Add New Book
            </Link>
          </div>
          <hr className="border-white/30" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {bookList}
        </div>
      </div>
    </div>
  );
}

export default ShowBookList;
