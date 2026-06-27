import express from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "video/mp4",
      "video/avi",
      "video/quicktime",
      "video/x-matroska",
      "video/x-msvideo",
    ];
    allowed.includes(file.mimetype) ||
    file.originalname.match(/\.(mp4|avi|mov|mkv)$/i)
      ? cb(null, true)
      : cb(new Error("Invalid video format"));
  },
});

const resolutionMap = {
  "1080p": "1920x1080",
  "720p": "1280x720",
  "480p": "854x480",
  "360p": "640x360",
};

const qualityMap = {
  low: 35,
  medium: 28,
  high: 22,
};

router.post("/process", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { operation, outputFormat, resolution, quality, thumbnailTime } =
    req.body;
  const inputPath = req.file.path;
  const jobId = uuidv4();

  try {
    if (operation === "thumbnail") {
      const outputPath = `outputs/${jobId}.jpg`;
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [thumbnailTime || "00:00:01"],
            filename: `${jobId}.jpg`,
            folder: "outputs",
          })
          .on("end", resolve)
          .on("error", reject);
      });

      const outputSize = fs.statSync(outputPath).size;
      fs.unlink(inputPath, () => {});
      return res.json({
        jobId,
        operation,
        originalSize: req.file.size,
        outputSize,
        downloadUrl: `http://localhost:3001/outputs/${jobId}.jpg`,
        originalName: req.file.originalname,
      });
    }

    let ext = outputFormat || "mp4";
    if (operation === "extract-audio") ext = outputFormat || "mp3";
    const outputPath = `outputs/${jobId}.${ext}`;
    const originalSize = req.file.size;

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);

      switch (operation) {
        case "compress":
          cmd = cmd
            .videoCodec("libx264")
            .addOption("-crf", String(qualityMap[quality] || 28))
            .addOption("-preset", "fast")
            .format("mp4");
          break;

        case "convert":
          cmd = cmd.format(ext);
          break;

        case "resize":
          const size = resolutionMap[resolution] || "1280x720";
          cmd = cmd.size(size).videoCodec("libx264").format("mp4");
          break;

        case "extract-audio":
          cmd = cmd.noVideo().audioCodec("libmp3lame").format("mp3");
          break;
      }

      cmd.save(outputPath).on("end", resolve).on("error", reject);
    });

    const outputSize = fs.statSync(outputPath).size;
    fs.unlink(inputPath, () => {});

    res.json({
      jobId,
      operation,
      originalSize,
      outputSize,
      savings: Math.round(((originalSize - outputSize) / originalSize) * 100),
      downloadUrl: `http://localhost:3001/outputs/${jobId}.${ext}`,
      originalName: req.file.originalname,
    });
  } catch (err) {
    console.error(err);
    fs.unlink(inputPath, () => {});
    res.status(500).json({ error: err.message });
  }
});

export default router;
