const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Load Book model
const Book = require('../../models/Book');

// 设置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// @route   GET api/books/test
// @desc    Tests books route
// @access  Public
router.get('/test', (req, res) => res.send('book route testing!'));

// @route   GET api/books
// @desc    Get all books
// @access  Public
router.get('/', (req, res) => {
  Book.find()
    .then(books => res.json(books))
    .catch(err => res.status(404).json({ nobooksfound: 'No Books found' }));
});

// @route   GET api/books/:id
// @desc    Get single book by id
// @access  Public
router.get('/:id', (req, res) => {
  Book.findById(req.params.id)
    .then(book => res.json(book))
    .catch(err => res.status(404).json({ nobookfound: 'No Book found' }));
});

// @route   POST api/books
// @desc    Add/save book (with image upload)
// @access  Public
router.post('/', upload.single('image'), (req, res) => {
  const bookData = req.body;
  if (req.file) {
    bookData.image = `/uploads/${req.file.filename}`;
  }
  Book.create(bookData)
    .then(book => res.json(book))
    .catch(err => res.status(400).json({ error: 'Unable to add this book' }));
});

// @route   PUT api/books/:id
// @desc    Update book by id (with image upload)
// @access  Public
router.put('/:id', upload.single('image'), (req, res) => {
  const bookData = req.body;
  if (req.file) {
    bookData.image = `/uploads/${req.file.filename}`;
  }
  Book.findByIdAndUpdate(req.params.id, bookData, { new: true })
    .then(book => res.json(book))
    .catch(err =>
      res.status(400).json({ error: 'Unable to update the Database' })
    );
});

// @route   DELETE api/books/:id
// @desc    Delete book by id
// @access  Public
router.delete('/:id', (req, res) => {
  Book.findByIdAndDelete(req.params.id)
    .then(book => res.json({ mgs: 'Book entry deleted successfully' }))
    .catch(err => res.status(404).json({ error: 'No such a book' }));
});

module.exports = router;