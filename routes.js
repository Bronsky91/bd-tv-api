const express = require("express");
const router = express.Router();

const videoController = require("./controllers/videoController");

router
  .route("/video")
  .get(videoController.index)
  .post(videoController.add)
  .patch(videoController.edit)
  .delete(videoController.remove);

router.route("/video/byid").get(videoController.byId);

router.route("/video/search").get(videoController.search);

router.route("/video/thumbnail").get(videoController.getThumbnailImage);

router.route("/video/stream").get(videoController.stream);

module.exports = router;
