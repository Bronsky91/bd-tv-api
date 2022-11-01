const fs = require("fs");
const { Deepgram } = require("@deepgram/sdk");
const ffmpegStatic = require("ffmpeg-static");
const deepgram = new Deepgram(process.env.DEEPGRAM_SECRET);
const { execSync: exec } = require("child_process");
const { KEYWORDS_POOL } = require("./constants");

exports.transcribeLocalVideo = async (filePath) => {
  ffmpeg(`-hide_banner -y -i ${filePath} ${filePath}.wav`);

  const audioFile = {
    buffer: fs.readFileSync(`${filePath}.wav`),
    mimetype: "audio/wav",
  };
  const response = await deepgram.transcription.preRecorded(audioFile, {
    punctuation: true,
  });
  return response.results;
};

exports.getKeywordsFromTranscriptWords = (words) => {
  const foundKeywords = words
    .filter((w) => KEYWORDS_POOL.includes(w.word) && w.confidence > 0.69)
    .map((w) => w.word);

  const keywordsSet = new Set(foundKeywords);
  const keywords = [...keywordsSet];
  return keywords;
};

const ffmpeg = async (command) => {
  return new Promise((resolve, reject) => {
    exec(`${ffmpegStatic} ${command}`, (err, stderr, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
};
