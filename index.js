require("dotenv").config({ override: true });
const bodyParser = require("body-parser");
const express = require("express");
var mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const timeout = require("connect-timeout");

const routes = require("./routes");

const app = express();
const port = process.env.PORT || 3000;

const mongoDB = process.env.MONGO_CONNECTION_STRING;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

// Get the default connection
const db = mongoose.connection;

// Bind connection to error event (to get notification of connection errors)
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb",
  })
);
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.use(timeout(120000));
app.use(haltOnTimedout);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(bodyParser.json());
app.use("/api", routes);

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}

app.listen(port, () => {
  console.log(`BD TV API listening on port ${port}`);
});
