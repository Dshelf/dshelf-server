require("dotenv").config();
const express = require("express");
const user = require("./routes/user");
const admin = require("./routes/admin");
const auth = require("./routes/auth");
const books = require("./routes/books");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const { ErrorHandler } = require("./middlewares/error");
const Logger = require("./middlewares/log");

const http = require("http");

const app = express();
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }));

//parse application/json
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
// Logger middleware
app.use(Logger.logRequest);

const EndpointHead = process.env.Endpoint;

app.use(`${EndpointHead}/auth`, auth);
app.use(`${EndpointHead}/user`, user);
app.use(`${EndpointHead}/books`, books);
app.use(`${EndpointHead}/admin`, admin);

// Error handler middleware
app.use(ErrorHandler);

//ini my database
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "Dshelf",
  })
  .then(() => {
    console.log("Database Connection is ready...");
  })
  .catch((err) => {
    console.log(err);
  });

server.listen(8000, function () {
  console.log(`App is Listening http://localhost:8000${EndpointHead}`);
});
