import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("outputs", { recursive: true });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/outputs", express.static(path.join(__dirname, "outputs")));

// ---- IMAGE ROUTES INLINE (no separate file import) ----
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.post("/api/image/process", (req, res) => {
  upload.single("file")(req, res, async (multerErr) => {
    if (multerErr) return res.status(400).json({ error: multerErr.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { operation, outputFormat, quality, width, height, cropX, cropY } =
      req.body;
    const inputPath = req.file.path;
    const originalSize = req.file.size;
    const jobId = uuidv4();
    const ext =
      operation === "compress" ? outputFormat || "jpg" : outputFormat || "png";
    const outputPath = path.join(__dirname, "outputs", `${jobId}.${ext}`);

    try {
      const { default: sharp } = await import("sharp");
      let image = sharp(inputPath);

      if (operation === "convert") {
        image = image.toFormat(ext);
      } else if (operation === "compress") {
        image = image.jpeg({ quality: parseInt(quality) || 80 });
      } else if (operation === "resize") {
        image = image.resize(
          width ? parseInt(width) : undefined,
          height ? parseInt(height) : undefined,
          { fit: "inside", withoutEnlargement: true },
        );
      } else if (operation === "crop") {
        image = image.extract({
          left: parseInt(cropX) || 0,
          top: parseInt(cropY) || 0,
          width: parseInt(width) || 200,
          height: parseInt(height) || 200,
        });
        // ✅ New
      } else if (operation === "remove-bg") {
        const { removeBackground } =
          await import("@imgly/background-removal-node");
        const inputBuffer = fs.readFileSync(inputPath);
        const blob = new Blob([inputBuffer]);
        const resultBlob = await removeBackground(blob);
        const arrayBuffer = await resultBlob.arrayBuffer();
        const finalPath = path.join(__dirname, "outputs", `${jobId}.png`);
        fs.writeFileSync(finalPath, Buffer.from(arrayBuffer));
        try {
          fs.unlinkSync(inputPath);
        } catch {}
        const outputSize = fs.statSync(finalPath).size;
        return res.json({
          jobId,
          originalSize,
          outputSize,
          savings: 0,
          downloadUrl: `http://localhost:3001/outputs/${jobId}.png`,
          originalName: req.file.originalname,
          operation,
          format: "png",
        });
      } else {
        return res
          .status(400)
          .json({ error: `Unknown operation: ${operation}` });
      }

      await image.toFile(outputPath);
      const outputSize = fs.statSync(outputPath).size;
      try {
        fs.unlinkSync(inputPath);
      } catch {}

      return res.json({
        jobId,
        originalSize,
        outputSize,
        savings: Math.max(
          0,
          Math.round(((originalSize - outputSize) / originalSize) * 100),
        ),
        downloadUrl: `http://localhost:3001/outputs/${jobId}.${ext}`,
        originalName: req.file.originalname,
        operation,
        format: ext,
      });
    } catch (err) {
      console.error("Sharp error:", err.message);
      try {
        fs.unlinkSync(inputPath);
      } catch {}
      return res.status(500).json({ error: err.message });
    }
  });
});

app.post("/api/image/batch", (req, res) => {
  upload.array("files", 20)(req, res, async (multerErr) => {
    if (multerErr) return res.status(400).json({ error: multerErr.message });
    if (!req.files?.length)
      return res.status(400).json({ error: "No files uploaded" });
    const { operation, outputFormat, quality, width, height } = req.body;
    const ext = outputFormat || "jpg";
    const results = [];
    for (const file of req.files) {
      const jobId = uuidv4();
      const outputPath = path.join(__dirname, "outputs", `${jobId}.${ext}`);
      try {
        const { default: sharp } = await import("sharp");
        let image = sharp(file.path);
        if (operation === "convert") image = image.toFormat(ext);
        else if (operation === "compress")
          image = image.jpeg({ quality: parseInt(quality) || 80 });
        else if (operation === "resize")
          image = image.resize(
            width ? parseInt(width) : undefined,
            height ? parseInt(height) : undefined,
            { fit: "inside" },
          );
        await image.toFile(outputPath);
        const outputSize = fs.statSync(outputPath).size;
        results.push({
          jobId,
          originalName: file.originalname,
          originalSize: file.size,
          outputSize,
          savings: Math.max(
            0,
            Math.round(((file.size - outputSize) / file.size) * 100),
          ),
          downloadUrl: `http://localhost:3001/outputs/${jobId}.${ext}`,
        });
      } catch (err) {
        results.push({ originalName: file.originalname, error: err.message });
      } finally {
        try {
          fs.unlinkSync(file.path);
        } catch {}
      }
    }
    return res.json({ results });
  });
});

// ---- VIDEO ROUTE (basic) ----
const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});
app.post("/api/video/process", (req, res) => {
  videoUpload.single("file")(req, res, async (multerErr) => {
    if (multerErr) return res.status(400).json({ error: multerErr.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { operation, outputFormat, resolution, quality, thumbnailTime } =
      req.body;
    const inputPath = req.file.path;
    const jobId = uuidv4();
    let ext =
      operation === "extract-audio"
        ? outputFormat || "mp3"
        : outputFormat || "mp4";
    if (operation === "thumbnail") ext = "jpg";
    const outputPath = path.join(__dirname, "outputs", `${jobId}.${ext}`);
    const resMap = {
      "1080p": "1920x1080",
      "720p": "1280x720",
      "480p": "854x480",
      "360p": "640x360",
    };
    const crf = { low: 35, medium: 28, high: 22 };
    try {
      const ffmpeg = (await import("fluent-ffmpeg")).default;
      await new Promise((resolve, reject) => {
        let cmd = ffmpeg(inputPath);
        if (operation === "thumbnail") {
          cmd
            .screenshots({
              timestamps: [thumbnailTime || 1],
              filename: `${jobId}.jpg`,
              folder: path.join(__dirname, "outputs"),
            })
            .on("end", resolve)
            .on("error", reject);
        } else {
          if (operation === "compress")
            cmd = cmd
              .videoCodec("libx264")
              .addOption("-crf", String(crf[quality] || 28))
              .addOption("-preset", "fast")
              .format("mp4");
          else if (operation === "convert") cmd = cmd.format(ext);
          else if (operation === "resize")
            cmd = cmd
              .size(resMap[resolution] || "1280x720")
              .videoCodec("libx264")
              .format("mp4");
          else if (operation === "extract-audio")
            cmd = cmd.noVideo().audioCodec("libmp3lame").format("mp3");
          cmd.save(outputPath).on("end", resolve).on("error", reject);
        }
      });
      const outputSize = fs.statSync(outputPath).size;
      try {
        fs.unlinkSync(inputPath);
      } catch {}
      return res.json({
        jobId,
        operation,
        originalSize: req.file.size,
        outputSize,
        savings: Math.max(
          0,
          Math.round(((req.file.size - outputSize) / req.file.size) * 100),
        ),
        downloadUrl: `http://localhost:3001/outputs/${jobId}.${ext}`,
        originalName: req.file.originalname,
      });
    } catch (err) {
      console.error("Video error:", err.message);
      try {
        fs.unlinkSync(inputPath);
      } catch {}
      return res.status(500).json({ error: err.message });
    }
  });
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((err, req, res, next) => {
  console.error("Unhandled:", err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(
    "Routes registered: /api/image/process, /api/video/process, /api/health",
  );
});
