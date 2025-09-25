import React from "react";
import { Link } from "react-router-dom";

const BookCard = ({ book }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full scale-90 max-w-xs mx-auto">
      <img
        src={book.image ? `http://localhost:8082${book.image}` : "/newbook.jpeg"}
        alt="Books"
        className="w-full h-32 object-cover"
      />
      <div className="p-3 flex-1 flex flex-col">
        <h2 className="text-lg font-semibold mb-1 text-blue-700">
          <Link to={`/show-book/${book._id}`}>{book.title}</Link>
        </h2>
        <h3 className="text-s text-gray-600 mb-2">{book.author}</h3>
        <p className="text-xs text-gray-500 flex-1">{book.description}</p>
      </div>
    </div>
  );
};

export default BookCard;
