const mongoose = require("mongoose");

exports.index = async (req, res) => {
  try {
    const testBody = { hello: "world" };

    res.json(testBody);
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};
