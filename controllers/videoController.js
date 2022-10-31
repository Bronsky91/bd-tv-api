require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { execSync: exec } = require("child_process");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  endpoint: "https://s3.filebase.com",
  signatureVersion: "v4",
});
const { Deepgram } = require("@deepgram/sdk");
const ffmpegStatic = require("ffmpeg-static");

const Video = require("../models/videoModel");

const deepgram = new Deepgram(process.env.DEEPGRAM_SECRET);

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
    const { name, tempFilePath } = videoFile;

    const s3Key = name + "-" + uuidv4();

    const buffer = fs.readFileSync(tempFilePath);

    const params = {
      Bucket: "bdtv",
      Key: s3Key,
      ContentType: "video/mp4",
      Body: buffer,
    };

    const putObjectPromise = s3.putObject(params).promise();

    await putObjectPromise;

    const transcriptData = await transcribeLocalVideo(tempFilePath);
    const { channels } = transcriptData;

    let transcriptText;

    if (channels && channels.length > 0) {
      const { alternatives } = channels[0];
      if (alternatives && alternatives.length > 0) {
        const { transcript } = alternatives[0];
        transcriptText = transcript;
      }
    }

    const newVideo = new Video();
    newVideo.key = s3Key;
    if (transcriptText) {
      newVideo.transcript = transcriptText;
    }
    newVideo.uploadDate = new Date();

    await newVideo.save();

    return res.json(newVideo);

    return res.sendStatus(200);
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

async function ffmpeg(command) {
  return new Promise((resolve, reject) => {
    exec(`${ffmpegStatic} ${command}`, (err, stderr, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
}

async function transcribeLocalVideo(filePath) {
  ffmpeg(`-hide_banner -y -i ${filePath} ${filePath}.wav`);

  const audioFile = {
    buffer: fs.readFileSync(`${filePath}.wav`),
    mimetype: "audio/wav",
  };
  const response = await deepgram.transcription.preRecorded(audioFile, {
    punctuation: true,
  });
  return response.results;
}
