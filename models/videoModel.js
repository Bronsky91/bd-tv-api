const mongoose = require("mongoose");

const videoModel = mongoose.Schema({
  title: String,
  description: String,
  transcript: String,
  creator: String,
  key: String,
  likes: Number,
  views: Number,
  category: String,
  uploadDate: Date,
  keywords: [String],
});

const Video = (module.exports = mongoose.model("video", videoModel));

module.exports.get = function (callback, limit) {
  Video.find(callback).limit(limit);
};
