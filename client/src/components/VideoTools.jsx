import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:3001";

const operations = [
  { id: "compress", label: "Compress", icon: "📦", desc: "Reduce file size" },
  { id: "convert", label: "Convert", icon: "🔄", desc: "Change format" },
  { id: "resize", label: "Resize", icon: "⤢", desc: "Change dimensions" },
  { id: "extract-audio", label: "Audio", icon: "🎵", desc: "Extract audio" },
  { id: "thumbnail", label: "Thumbnail", icon: "🖼️", desc: "Grab a frame" },
];

const videoFormats = ["mp4", "webm", "avi", "mov", "mkv"];
const audioFormats = ["mp3", "aac", "wav", "ogg"];

function formatBytes(bytes) {
  if (!bytes) return "?";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export default function VideoTools({ onResult }) {
  const [file, setFile] = useState(null);
  const [operation, setOperation] = useState("compress");
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [crf, setCrf] = useState(28);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [thumbTime, setThumbTime] = useState(1);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFile = useCallback((incoming) => {
    const f = incoming[0];
    if (f && f.type.startsWith("video/")) {
      setFile(f);
      setResult(null);
      setError("");
    } else {
      setError("Please select a video file.");
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files);
    },
    [handleFile],
  );

  const handleDownload = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  };

  const processVideo = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setResult(null);
    setError("");

    // Fake smooth progress while FFmpeg works
    const timer = setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.random() * 8 : p));
    }, 800);

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("operation", operation);
      if (operation === "convert") {
        formData.append("outputFormat", outputFormat);
      } else if (operation === "extract-audio") {
        formData.append("outputFormat", audioFormat);
      } else {
        formData.append("outputFormat", "mp4");
      }
      formData.append("crf", crf);
      if (width) formData.append("width", width);
      if (height) formData.append("height", height);
      if (operation === "thumbnail") formData.append("timestamp", thumbTime);

      const res = await fetch(`${API}/api/process-video`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Processing failed");

      clearInterval(timer);
      setProgress(100);

      const fmt =
        operation === "extract-audio"
          ? audioFormat
          : operation === "thumbnail"
            ? "jpg"
            : outputFormat;
      const item = {
        originalName: file.name,
        beforeSize: file.size,
        afterSize: data.outputSize,
        downloadUrl: data.downloadUrl,
        format: fmt,
        operation,
        type: "video",
        timestamp: new Date().toISOString(),
      };
      setResult(item);
      onResult(item);
    } catch (err) {
      clearInterval(timer);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold text-white mb-2">
          Video <span className="gradient-text">Processing</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Compress, convert, resize, extract audio, and grab thumbnails from
          videos.
        </p>
      </motion.div>

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 1 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: dragging ? 1.02 : 1,
        }}
        transition={{ delay: 0.15 }}
        onClick={() => fileRef.current.click()}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className={`upload-pulse relative rounded-2xl border-2 border-dashed cursor-pointer p-12 text-center transition-all duration-300 mb-8 overflow-hidden ${
          dragging ? "border-cyan-500 bg-cyan-500/10" : "hover:bg-white/5"
        }`}
        style={{
          borderColor: dragging ? "rgba(6,182,212,0.8)" : "rgba(6,182,212,0.3)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-violet-900/10 pointer-events-none" />

        <motion.div
          animate={{ y: dragging ? -8 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #0891b2, #22d3ee)",
              boxShadow: "0 0 30px rgba(6,182,212,0.4)",
            }}
          >
            🎬
          </div>

          {file ? (
            <div>
              <p className="text-white font-semibold text-lg">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">
                {formatBytes(file.size)}
              </p>
              <p className="text-cyan-400 text-xs mt-2">Click to change file</p>
            </div>
          ) : (
            <div>
              <p className="text-white font-semibold text-lg">
                Drop video here or{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  click to browse
                </span>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                MP4, MOV, AVI, WebM, MKV supported
              </p>
            </div>
          )}
        </motion.div>

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />
      </motion.div>

      {/* Operations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6"
      >
        {operations.map((op, i) => (
          <motion.button
            key={op.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setOperation(op.id)}
            className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
              operation === op.id
                ? "border-cyan-500 bg-cyan-500/15"
                : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6"
            }`}
          >
            {operation === op.id && (
              <motion.div
                layoutId="activeVideoOp"
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-600/20 to-transparent"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 text-xl block mb-1">{op.icon}</span>
            <span
              className={`relative z-10 block text-sm font-semibold ${operation === op.id ? "text-cyan-300" : "text-white"}`}
            >
              {op.label}
            </span>
            <span className="relative z-10 block text-xs text-slate-500 mt-0.5">
              {op.desc}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Options */}
      <AnimatePresence mode="wait">
        <motion.div
          key={operation}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass rounded-2xl p-6 mb-6 border border-white/5 overflow-hidden"
        >
          {operation === "compress" && (
            <div className="flex items-center gap-6 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Quality (lower = smaller file)
              </label>
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="range"
                  min={18}
                  max={51}
                  value={crf}
                  onChange={(e) => setCrf(Number(e.target.value))}
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-cyan-400 font-bold text-lg w-8">
                  {crf}
                </span>
              </div>
              <div className="flex gap-2">
                {[18, 28, 38].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCrf(v)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${crf === v ? "bg-cyan-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                  >
                    {v === 18 ? "Best" : v === 28 ? "Balanced" : "Small"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {operation === "convert" && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Output Format
              </label>
              <div className="flex gap-2 flex-wrap">
                {videoFormats.map((f) => (
                  <button
                    key={f}
                    onClick={() => setOutputFormat(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      outputFormat === f
                        ? "bg-cyan-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {operation === "resize" && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Dimensions
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Width px"
                  className="w-28 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height px"
                  className="w-28 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-2">
                {[
                  ["720p", "1280", "720"],
                  ["1080p", "1920", "1080"],
                  ["480p", "854", "480"],
                ].map(([label, w, h]) => (
                  <button
                    key={label}
                    onClick={() => {
                      setWidth(w);
                      setHeight(h);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {operation === "extract-audio" && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Audio Format
              </label>
              <div className="flex gap-2">
                {audioFormats.map((f) => (
                  <button
                    key={f}
                    onClick={() => setAudioFormat(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      audioFormat === f
                        ? "bg-cyan-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {operation === "thumbnail" && (
            <div className="flex items-center gap-6 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Timestamp (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={thumbTime}
                  onChange={(e) => setThumbTime(Number(e.target.value))}
                  className="w-28 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
                <span className="text-slate-400 text-sm">
                  seconds into the video
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Process button */}
      <motion.button
        whileHover={{
          scale: file ? 1.02 : 1,
          boxShadow: file ? "0 0 40px rgba(6,182,212,0.4)" : "none",
        }}
        whileTap={{ scale: file ? 0.98 : 1 }}
        onClick={processVideo}
        disabled={!file || processing}
        className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-300 relative overflow-hidden mb-8 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background:
            file && !processing
              ? "linear-gradient(135deg, #0891b2, #0e7490, #0891b2)"
              : "rgba(8,145,178,0.3)",
        }}
      >
        {processing && <div className="shimmer absolute inset-0" />}
        {processing
          ? `Processing... ${Math.round(progress)}%`
          : "🎬 Process Video"}
      </motion.button>

      {/* Progress bar */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6"
          >
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>FFmpeg processing — this may take a moment...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full progress-bar-shine"
                style={{
                  background: "linear-gradient(90deg, #0891b2, #7c3aed)",
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2"
          >
            <span>⚠️</span> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="text-lg font-bold text-white mb-4">Result</h3>
            <motion.div
              className="glass rounded-2xl p-5 flex items-center justify-between gap-4"
              style={{ border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl flex-shrink-0">
                  ✅
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {result.originalName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-slate-400 text-xs">
                      {formatBytes(result.beforeSize)}
                    </span>
                    <span className="text-slate-600 text-xs">→</span>
                    <span
                      className={`text-xs font-medium ${result.afterSize < result.beforeSize ? "text-emerald-400" : "text-slate-400"}`}
                    >
                      {formatBytes(result.afterSize)}
                    </span>
                    {result.beforeSize > result.afterSize && (
                      <span className="text-emerald-400 text-xs bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                        -
                        {Math.round(
                          (1 - result.afterSize / result.beforeSize) * 100,
                        )}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const baseName = (result.originalName || "video").replace(
                    /\.[^.]+$/,
                    "",
                  );
                  handleDownload(
                    result.downloadUrl,
                    `${baseName}.${result.format}`,
                  );
                }}
                className="flex-shrink-0 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                ⬇ Download
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
