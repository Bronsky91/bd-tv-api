require("dotenv").config();
const bodyParser = require("body-parser");
const express = require("express");
var mongoose = require("mongoose");

const routes = require("./routes");

const app = express();
const port = process.env.PORT || 3000;

// const mongoDB = process.env.MONGO_CONNECTION_STRING;
// mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

//Get the default connection
// const db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
// db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb",
  })
);

app.use(bodyParser.json());
app.use("/api", routes);

app.listen(port, () => {
  console.log(`BD TV API listening on port ${port}`);
});
