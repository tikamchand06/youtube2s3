require("dotenv").config();
const cors = require("cors");
const express = require("express");
const AWS = require("aws-sdk");
const stream = require("stream");
const ytdl = require("ytdl-core");

const app = express();
const PORT = process.env.PORT || 8888;

// Add headers
app.options("*", cors());
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.json({ extended: false, limit: "50mb", parameterLimit: 50000 })); // Init Middleware

app.get("/", (req, res) => res.send("API Operational"));

app.get("/api/youtube2s3", (req, res) => {
  const { id, url } = req.query;
  if (!url || !id) return res.send("Please add the 'url' & 'id' parameters.");

  console.log(url, "started at", new Date());

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
    if (err) {
      console.log(url, "has an error", err);
    } else {
      console.log(url, "Uploaded successfully at", new Date());
    }
  });

  res.send("youtube2s3 Operational");
});

app.listen(PORT, () => console.log(`Server listening at PORT: ${PORT}`));

module.exports = app;
