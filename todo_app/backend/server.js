const express = require("express");
const cors = require("cors");

const connectdb = require("./mongodb");

const todoRoute = require("./routes/todoRoute");

const app = express();

app.use(express.json());
app.use(cors());

connectdb();

app.use("/api", todoRoute);

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
