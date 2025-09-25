import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function ShowBookDetails(props) {
  const [book, setBook] = useState({});

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBook = () => {
      axios
        .get(`http://localhost:8082/api/books/${id}`)
        .then((res) => {
          setBook(res.data);
        })
        .catch((err) => {
          console.log("Error from ShowBookDetails");
        });
    };
    fetchBook();
    const handler = () => fetchBook();
    window.addEventListener('books:changed', handler);
    return () => window.removeEventListener('books:changed', handler);
  }, [id]);

  const onDeleteClick = (id) => {
    axios
      .delete(`http://localhost:8082/api/books/${id}`)
      .then((res) => {
        navigate("/");
      })
      .catch((err) => {
        console.log("Error form ShowBookDetails_deleteClick");
      });
  };

  const BookItem = (
    <div>
      <div className="mb-4 flex justify-center">
        <img
          src={book.image ? `http://localhost:8082${book.image}` : "/newbook.jpeg"}
          alt="Book"
          className="max-h-48 rounded shadow"
        />
      </div>
      <table className="table table-hover table-dark">
        <tbody>
          <tr>
            <th scope="row">1</th>
            <td>Title</td>
            <td>{book.title}</td>
          </tr>
          <tr>
            <th scope="row">2</th>
            <td>Author</td>
            <td>{book.author}</td>
          </tr>
          <tr>
            <th scope="row">3</th>
            <td>ISBN</td>
            <td>{book.isbn}</td>
          </tr>
          <tr>
            <th scope="row">4</th>
            <td>Publisher</td>
            <td>{book.publisher}</td>
          </tr>
          <tr>
            <th scope="row">5</th>
            <td>Published Date</td>
            <td>{book.published_date}</td>
          </tr>
          <tr>
            <th scope="row">6</th>
            <td>Description</td>
            <td>{book.description}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="ShowBookDetails">
      <div className="container">
        <div className="row">
          <div className="col-md-10 m-auto">
            <br /> <br />
            <Link to="/" className="btn btn-outline-warning float-left">
              Show Book List
            </Link>
          </div>
          <br />
          <div className="col-md-8 m-auto">
            <h1 className="display-4 text-center">Book's Record</h1>
            <p className="lead text-center">View Book's Info</p>
            <hr /> <br />
          </div>
          <div className="col-md-10 m-auto">{BookItem}</div>
          <div className="col-md-6 m-auto">
            <button
              type="button"
              className="btn btn-outline-danger btn-lg btn-block"
              onClick={() => {
                onDeleteClick(book._id);
              }}
            >
              Delete Book
            </button>
          </div>
          <div className="col-md-6 m-auto">
            <Link
              to={`/edit-book/${book._id}`}
              className="btn btn-outline-info btn-lg btn-block"
            >
              Edit Book
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShowBookDetails;
