require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  endpoint: "https://s3.filebase.com",
  signatureVersion: "v4",
});

const thumbsupply = require("thumbsupply");

const Video = require("../models/videoModel");
const {
  transcribeLocalVideo,
  getKeywordsFromTranscriptWords,
} = require("../utils");
const { THUMBNAIL_BUCKET, VIDEO_BUCKET } = require("../constants");

exports.index = async (req, res) => {
  try {
    const videos = await Video.find({});

    return res.json({ videos });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

exports.byId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req);
    const video = await Video.findById(id);

    return res.json({ video });
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
    const { name, tempFilePath, mimetype } = videoFile;

    // Uploads video to S3
    const s3VideoKey = name + "-" + uuidv4();
    const videoBuffer = fs.readFileSync(tempFilePath);
    const videoParams = {
      Bucket: VIDEO_BUCKET,
      Key: s3VideoKey,
      ContentType: "video/mp4",
      Body: videoBuffer,
    };
    const putVideoObjectPromise = s3.putObject(videoParams).promise();
    putVideoObjectPromise.finally((res) => {
      console.log("Video finished uploading");
    });

    // Uploads thumbnail to S3
    const thumbnailPath = await thumbsupply.generateThumbnail(tempFilePath, {
      mimetype,
    });
    const s3ThumbnailKey = name + "-thumbnail-" + uuidv4();
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const thumbnailParams = {
      Bucket: THUMBNAIL_BUCKET,
      Key: s3ThumbnailKey,
      ContentType: "image/png",
      Body: thumbnailBuffer,
    };
    const putThumbnailObjectPromise = s3.putObject(thumbnailParams).promise();
    await putThumbnailObjectPromise;

    // Gets transcript and keywords
    const transcriptData = await transcribeLocalVideo(tempFilePath);
    const { channels } = transcriptData;

    let transcriptText;
    let transcriptWords;

    if (channels && channels.length > 0) {
      const { alternatives } = channels[0];
      if (alternatives && alternatives.length > 0) {
        const { transcript, words } = alternatives[0];
        transcriptText = transcript;
        transcriptWords = words;
      }
    }

    // Creates video mongo document
    const newVideo = new Video();
    newVideo.key = s3VideoKey;
    newVideo.thumbnailKey = s3ThumbnailKey;
    if (transcriptText) {
      newVideo.transcript = transcriptText;
    }
    if (transcriptWords) {
      newVideo.keywords = getKeywordsFromTranscriptWords(transcriptWords);
    }
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
    const { term } = req.query;
    if (term) {
      const regex = new RegExp(term, "i");
      const searchArray = term.split(" ");
      const query = {
        $or: [
          { title: regex },
          { keywords: { $in: searchArray } },
          { description: regex },
          { creator: regex },
        ],
      };

      const videos = await Video.find(query);
      return res.json({ videos });
    }

    const allVideos = await Video.find({});
    return res.json({ videos: allVideos });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error });
  }
};

exports.stream = async (req, res) => {
  res.setHeader("content-type", "video/mp4");

  const { key } = req.query;

  const params = {
    Bucket: VIDEO_BUCKET,
    Key: key,
  };
  const fileStream = await s3.getObject(params).createReadStream();

  fileStream.on("error", (error) => {
    console.log(error);
    res.sendStatus(500);
  });

  fileStream.pipe(res);
};

exports.getThumbnailImage = async (req, res) => {
  try {
    const { key } = req.query;

    const params = {
      Bucket: THUMBNAIL_BUCKET,
      Key: key,
    };
    const readStream = await s3.getObject(params).createReadStream();

    readStream.pipe(res);
  } catch (error) {
    console.log(error);
    res.sendStatus(404);
  }
};
