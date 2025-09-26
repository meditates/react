const express = require('express');
const connectDB = require('./config/db');
const routes = require("./routes/api/books");
const assistantRoutes = require('./routes/api/assistant');
const cors = require("cors");
const bodyParser = require("body-parser");
require('dotenv').config();

const app = express();

// Set timeout for all requests (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// use the cors middleware with the
// origin and credentials options
app.use(cors({ origin: true, credentials: true }));

// use the body-parser middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// use the routes module as a middleware
// for the /api/books path
app.use("/api/books", routes);
app.use('/api/assistant', assistantRoutes);
app.use('/uploads', express.static('uploads'));

// Connect Database
connectDB();

app.get('/', (req, res) => res.send('Hello world!'));

const port = process.env.PORT || 8082;

app.listen(port, () => console.log(`Server running on port ${port}`));