require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  endpoint: "https://s3.filebase.com",
  signatureVersion: "v4",
});

const Video = require("../models/videoModel");

exports.index = async (req, res) => {
  try {
    const videos = await Video.find({});

    return res.json({ videos });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

exports.add = async (req, res) => {
  try {
    const { files } = req;

    if (!files || Object.keys(req.files).length === 0) {
      return res.status(400).send({ error: "No files were uploaded" });
    }

    const videoFile = files.video;
    const { data, name } = videoFile;

    const s3Key = name + "-" + uuidv4();

    const params = {
      Bucket: "bdtv",
      Key: s3Key,
      ContentType: "video/mp4",
      Body: data,
    };

    const putObjectPromise = s3.putObject(params).promise();

    await putObjectPromise;

    const newVideo = new Video();
    newVideo.key = s3Key;
    newVideo.uploadDate = new Date();

    await newVideo.save();

    return res.json(newVideo);
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

// _id is required in the requesty body
exports.edit = async (req, res) => {
  try {
    const { body } = req;

    if (!body || !body?._id) {
      return res.status(400).send({ error: "No video was edited" });
    }

    const updatedVideo = await Video.findOneAndUpdate({ _id: body._id }, body, {
      new: true,
    }).lean();

    return res.json(updatedVideo);
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

exports.remove = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).send({ error: "No video was deleted" });
    }

    await Video.deleteOne({ _id });

    return res.json(updatedVideo);
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

exports.search = async (req, res) => {
  try {
    const videos = await Video.find({});

    return res.json({ videos });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

// TODO: stream video content from S3?
// exports.stream

exports.download = async (req, res) => {
  try {
    const { key } = req.query;

    const params = {
      Key: key,
      Bucket: "bdtv",
    };

    s3.getObject(params, function (error, data) {
      if (error) {
        console.log("Error while reading file " + key);
        console.log(error);
      } else {
        console.log("Returning contents from " + key);
        console.log("data", data);
      }
    });

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};
