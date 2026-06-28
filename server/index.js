import "dotenv/config"; // ← MUST be first, before everything

import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import connectDB from "./config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ✅ Add this debug line temporarily
//console.log("MONGO_URI:", process.env.MONGO_URI);

connectDB();

const PORT = process.env.PORT || 3001;

// ================== PATHS ==================
const FFMPEG_PATH = "C:\\ffmpeg-8.1.1-essentials_build\\bin\\ffmpeg.exe";

const uploadsDir = "C:\\mediatools\\uploads";
const outputsDir = "C:\\mediatools\\outputs";

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });

// ================== CONFIG ==================
const JWT_SECRET = process.env.JWT_SECRET;

const USERS_FILE = path.join(__dirname, "users.json");
const HISTORY_FILE = path.join(__dirname, "history.json");

// ================== MIDDLEWARE ==================
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/outputs", express.static(outputsDir));

// ================== USER FUNCTIONS ==================
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch {}
  return [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
  } catch {}
  return {};
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// ================== AUTH MIDDLEWARE ==================
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ================== AUTH ROUTES ==================

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const users = loadUsers();
  if (users.find((u) => u.email === email))
    return res.status(400).json({ error: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);
  users.push({ id: uuidv4(), name: name || email, email, password: hashed });
  saveUsers(users);

  return res.json({ success: true, message: "Registered successfully" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  return res.json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  return res.json({ success: true, user: req.user });
});

// ================== FFMPEG ==================
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    console.log("\n===============================");
    console.log("Running FFmpeg");
    console.log(FFMPEG_PATH, args.join(" "));
    console.log("===============================\n");

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = "";

    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("FFmpeg failed:\n" + stderr));
    });

    proc.on("error", (err) => reject(err));
  });
}

// ================== IMAGE MULTER ==================
const imageStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ================== IMAGE PROCESS ==================
app.post("/api/image/process", (req, res) => {
  imageUpload.single("file")(req, res, async (multerErr) => {
    if (multerErr) return res.status(400).json({ error: multerErr.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { operation, outputFormat, quality, width, height, cropX, cropY } =
      req.body;

    const inputPath = req.file.path;
    const originalSize = req.file.size;
    const jobId = uuidv4();
    const ext =
      operation === "compress" ? outputFormat || "jpg" : outputFormat || "png";
    const outputPath = path.join(outputsDir, `${jobId}.${ext}`);

    try {
      const { default: sharp } = await import("sharp");
      let image = sharp(inputPath);

      switch (operation) {
        case "convert":
          image = image.toFormat(ext);
          break;

        case "compress":
          image = image.jpeg({ quality: parseInt(quality) || 80 });
          break;

        case "resize":
          image = image.resize(
            width ? parseInt(width) : undefined,
            height ? parseInt(height) : undefined,
            { fit: "inside", withoutEnlargement: true },
          );
          break;

        case "crop":
          image = image.extract({
            left: parseInt(cropX) || 0,
            top: parseInt(cropY) || 0,
            width: parseInt(width) || 200,
            height: parseInt(height) || 200,
          });
          break;

        case "remove-bg": {
          const finalPath = path.join(outputsDir, `${jobId}.png`);
          const { data, info } = await sharp(inputPath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

          const channels = info.channels;
          const bgR = data[0];
          const bgG = data[1];
          const bgB = data[2];
          const threshold = 40;

          for (let i = 0; i < data.length; i += channels) {
            const diff =
              Math.abs(data[i] - bgR) +
              Math.abs(data[i + 1] - bgG) +
              Math.abs(data[i + 2] - bgB);
            if (diff < threshold) data[i + 3] = 0;
          }

          await sharp(Buffer.from(data), {
            raw: { width: info.width, height: info.height, channels },
          })
            .png()
            .toFile(finalPath);

          try {
            fs.unlinkSync(inputPath);
          } catch {}

          const outputSize = fs.statSync(finalPath).size;
          return res.json({
            success: true,
            jobId,
            operation,
            format: "png",
            originalName: req.file.originalname,
            originalSize,
            outputSize,
            savings: 0,
            downloadUrl: `http://localhost:3001/outputs/${jobId}.png`,
          });
        }

        default:
          return res.status(400).json({ error: "Invalid operation" });
      }

      await image.toFile(outputPath);
      const outputSize = fs.statSync(outputPath).size;
      try {
        fs.unlinkSync(inputPath);
      } catch {}

      return res.json({
        success: true,
        jobId,
        operation,
        format: ext,
        originalName: req.file.originalname,
        originalSize,
        outputSize,
        savings: Math.max(
          0,
          Math.round(((originalSize - outputSize) / originalSize) * 100),
        ),
        downloadUrl: `http://localhost:3001/outputs/${jobId}.${ext}`,
      });
    } catch (err) {
      try {
        fs.unlinkSync(inputPath);
      } catch {}
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  });
});

// ================== VIDEO MULTER ==================
const videoStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

// ================== VIDEO PROCESS ==================
app.post(
  "/api/process-video",
  videoUpload.single("video"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No video uploaded" });

    const { operation, outputFormat, crf, width, height, timestamp } = req.body;
    const inputPath = req.file.path;
    const outputId = uuidv4();

    let ext = "mp4";
    if (operation === "convert") ext = outputFormat || "mp4";
    if (operation === "thumbnail") ext = "jpg";
    if (operation === "extract-audio") ext = outputFormat || "mp3";

    const outputPath = path.join(outputsDir, `${outputId}.${ext}`);

    try {
      let args = [];

      if (operation === "compress") {
        args = [
          "-i",
          inputPath,
          "-c:v",
          "libx264",
          "-crf",
          String(crf || 28),
          "-preset",
          "fast",
          "-c:a",
          "aac",
          "-y",
          outputPath,
        ];
      } else if (operation === "convert") {
        switch (ext) {
          case "webm":
            args = [
              "-i",
              inputPath,
              "-c:v",
              "libvpx-vp9",
              "-c:a",
              "libopus",
              "-y",
              outputPath,
            ];
            break;
          case "avi":
            args = [
              "-i",
              inputPath,
              "-c:v",
              "mpeg4",
              "-c:a",
              "mp3",
              "-y",
              outputPath,
            ];
            break;
          default:
            args = [
              "-i",
              inputPath,
              "-c:v",
              "libx264",
              "-c:a",
              "aac",
              "-y",
              outputPath,
            ];
        }
      } else if (operation === "resize") {
        const w = width || "1280";
        const h = height || "720";
        args = [
          "-i",
          inputPath,
          "-vf",
          `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "-pix_fmt",
          "yuv420p",
          "-y",
          outputPath,
        ];
      } else if (operation === "extract-audio") {
        const codec =
          ext === "wav"
            ? "pcm_s16le"
            : ext === "aac"
              ? "aac"
              : ext === "ogg"
                ? "libvorbis"
                : "libmp3lame";
        args = ["-i", inputPath, "-vn", "-acodec", codec, "-y", outputPath];
      } else if (operation === "thumbnail") {
        args = [
          "-i",
          inputPath,
          "-ss",
          String(timestamp || 1),
          "-frames:v",
          "1",
          "-y",
          outputPath,
        ];
      } else {
        return res.status(400).json({ error: "Unknown operation" });
      }

      await runFFmpeg(args);

      if (!fs.existsSync(outputPath))
        throw new Error("Output file was not created.");

      const outputSize = fs.statSync(outputPath).size;
      try {
        fs.unlinkSync(inputPath);
      } catch {}

      setTimeout(
        () => {
          try {
            fs.unlinkSync(outputPath);
          } catch {}
        },
        60 * 60 * 1000,
      );

      return res.json({
        success: true,
        operation,
        format: ext,
        outputSize,
        originalSize: req.file.size,
        originalName: req.file.originalname,
        downloadUrl: `http://localhost:3001/outputs/${outputId}.${ext}`,
      });
    } catch (err) {
      try {
        fs.unlinkSync(inputPath);
      } catch {}
      try {
        fs.unlinkSync(outputPath);
      } catch {}
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  },
);

// ================== HISTORY ROUTES ==================
app.get("/api/history", requireAuth, (req, res) => {
  const history = loadHistory();
  return res.json({ success: true, history: history[req.user.id] || [] });
});

app.post("/api/history", requireAuth, (req, res) => {
  const history = loadHistory();
  if (!history[req.user.id]) history[req.user.id] = [];
  history[req.user.id].unshift({
    ...req.body,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  });
  history[req.user.id] = history[req.user.id].slice(0, 100);
  saveHistory(history);
  return res.json({ success: true });
});

app.delete("/api/history", requireAuth, (req, res) => {
  const history = loadHistory();
  history[req.user.id] = [];
  saveHistory(history);
  return res.json({ success: true });
});

// ================== HEALTH CHECK ==================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ================== DEFAULT ROUTE ==================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Media Tools API",
    version: "1.0.0",
    routes: {
      image: "/api/image/process",
      video: "/api/process-video",
      register: "/api/auth/register",
      login: "/api/auth/login",
      history: "/api/history",
      health: "/api/health",
    },
  });
});

// ================== 404 HANDLER ==================
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error("\n========== SERVER ERROR ==========");
  console.error(err.stack || err.message);
  console.error("==================================\n");
  res
    .status(500)
    .json({ success: false, error: err.message || "Internal Server Error" });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log("\n========================================");
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("========================================");
  console.log("POST  /api/image/process");
  console.log("POST  /api/process-video");
  console.log("POST  /api/auth/register");
  console.log("POST  /api/auth/login");
  console.log("GET   /api/auth/me");
  console.log("GET   /api/history");
  console.log("POST  /api/history");
  console.log("DELETE /api/history");
  console.log("GET   /api/health");
  console.log("========================================\n");
});
