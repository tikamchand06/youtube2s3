require("dotenv").config();
const cors = require("cors");
const express = require("express");
const AWS = require("aws-sdk");
const stream = require("stream");
const ytdl = require("ytdl-core");

const app = express();
const PORT = process.env.PORT || 8888;

const uploadToS3 = (url, id) => {
  return new Promise((resolve, reject) => {
    const videoStream = new stream.PassThrough();
    ytdl(url, { quality: "lowestaudio" }).pipe(videoStream);

    const s3Object = new AWS.S3();
    const upload = s3Object.upload({
      Body: videoStream,
      partSize: 1024 * 1024 * 64,
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `videos/${id}_${new Date().getTime()}.mp4`,
    });

    upload.send((err) => {
      if (err) reject(err);
      else resolve("success");
    });
  });
};

// Add headers
app.options("*", cors());
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.json({ extended: false, limit: "50mb", parameterLimit: 50000 })); // Init Middleware

app.get("/", (req, res) => res.send("API Operational"));

app.post("/api/youtube2s3", async (req, res) => {
  const { id, url } = req.body;
  if (!url || !id) return res.send("Please add the 'url' & 'id' parameters.");

  const response = { params: { id, url }, time: { starts: new Date(), ends: null }, result: "", message: "" };

  try {
    const result = await uploadToS3(url, id);
    res.status(200).json({ ...response, result, time: { ...response.time, ends: new Date() } });
  } catch (error) {
    res.status(500).json({ ...response, result: "failed", time: { ...response.time, ends: new Date() }, error });
  }
});

app.post("/api/getYTInfo", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.send("Please enter the valid URL.");

  try {
    const id = ytdl.getURLVideoID(url);
    const result = await ytdl.getInfo(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ msg: "An error occurred. Please try again later.", error });
  }
});

app.listen(PORT, () => console.log(`Server listening at PORT: ${PORT}`));

module.exports = app;
