const express = require("express");
const router = express.Router();

const videoController = require("./controllers/videoController");

router.route("/video").get(videoController.index);

module.exports = router;
