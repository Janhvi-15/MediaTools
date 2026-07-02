import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

//const API = "http://localhost:3001";
// ✅ Replace with this import
import API from "../config.js"; // for files inside components/
// OR
import API from "./config.js"; // for App.jsx which is in src/

const operations = [
  { id: "convert", label: "Convert", icon: "🔄", desc: "Change format" },
  { id: "compress", label: "Compress", icon: "📦", desc: "Reduce size" },
  { id: "resize", label: "Resize", icon: "⤢", desc: "Change dimensions" },
  { id: "crop", label: "Crop", icon: "✂️", desc: "Crop to area" },
  {
    id: "remove-bg",
    label: "Remove BG",
    icon: "🪄",
    desc: "Remove background",
  },
];

const formats = ["png", "jpeg", "webp", "avif", "gif", "tiff"];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export default function ImageTools({ onResult }) {
  const [files, setFiles] = useState([]);
  const [operation, setOperation] = useState("convert");
  const [outputFormat, setOutputFormat] = useState("png");
  const [quality, setQuality] = useState(80);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(200);
  const [cropH, setCropH] = useState(200);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFiles = useCallback((incoming) => {
    const imgs = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFiles(imgs);
    setResults([]);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
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

  const processImages = async () => {
    if (!files.length) return;
    setProcessing(true);
    setProgress(0);
    setResults([]);
    const newResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(Math.round((i / files.length) * 100));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("operation", operation);
      formData.append("outputFormat", outputFormat);
      formData.append("quality", quality);
      if (operation === "resize") {
        if (width) formData.append("width", width);
        if (height) formData.append("height", height);
      }
      if (operation === "crop") {
        formData.append("cropX", cropX);
        formData.append("cropY", cropY);
        formData.append("cropWidth", cropW);
        formData.append("cropHeight", cropH);
      }

      try {
        const res = await fetch(`${API}/api/image/process`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const result = {
          originalName: data.originalName || file.name,
          beforeSize: data.originalSize || file.size,
          afterSize: data.outputSize,
          downloadUrl: data.downloadUrl, // server already returns full URL
          format: data.format || outputFormat,
          operation,
          type: "image",
          timestamp: new Date().toISOString(),
        };
        newResults.push({ ...result, success: true });
        onResult(result);
      } catch (err) {
        newResults.push({ originalName: file.name, error: err.message });
      }
    }

    setProgress(100);
    setResults(newResults);
    setProcessing(false);
  };

  const savings = results.reduce((acc, r) => {
    if (r.success && r.beforeSize > r.afterSize)
      acc += r.beforeSize - r.afterSize;
    return acc;
  }, 0);

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
          Image <span className="gradient-text">Processing</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Convert, compress, resize, crop, and remove backgrounds from images.
        </p>
      </motion.div>

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 1 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: dragging ? 1.02 : 1,
          borderColor: dragging ? "rgba(139,92,246,1)" : "rgba(139,92,246,0.3)",
        }}
        transition={{ delay: 0.15 }}
        onClick={() => fileRef.current.click()}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className={`upload-pulse relative rounded-2xl border-2 border-dashed cursor-pointer p-12 text-center transition-all duration-300 mb-8 overflow-hidden ${dragging ? "bg-violet-500/10" : "bg-white/2 hover:bg-white/5"}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 to-cyan-900/10 pointer-events-none" />

        <motion.div
          animate={{ y: dragging ? -8 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative"
        >
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
          >
            ☁️
          </div>

          {files.length > 0 ? (
            <div>
              <p className="text-white font-semibold text-lg">
                {files.length} image{files.length > 1 ? "s" : ""} selected
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="text-violet-400 text-xs mt-2">
                Click to change files
              </p>
            </div>
          ) : (
            <div>
              <p className="text-white font-semibold text-lg">
                Drop images here or{" "}
                <span className="gradient-text">click to browse</span>
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Select multiple files for batch processing
              </p>
            </div>
          )}
        </motion.div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </motion.div>

      {/* Operations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6"
      >
        {operations.map((op, i) => (
          <motion.button
            key={op.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setOperation(op.id)}
            className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
              operation === op.id
                ? "border-violet-500 bg-violet-500/15"
                : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6"
            }`}
          >
            {operation === op.id && (
              <motion.div
                layoutId="activeOp"
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600/20 to-transparent"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 text-xl block mb-1">{op.icon}</span>
            <span
              className={`relative z-10 block text-sm font-semibold ${operation === op.id ? "text-violet-300" : "text-white"}`}
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
          className="glass rounded-2xl p-6 mb-6 overflow-hidden border border-white/5"
        >
          {operation === "convert" && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Output Format
              </label>
              <div className="flex gap-2 flex-wrap">
                {formats.map((f) => (
                  <button
                    key={f}
                    onClick={() => setOutputFormat(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      outputFormat === f
                        ? "bg-violet-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {operation === "compress" && (
            <div className="flex items-center gap-6 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">
                Quality
              </label>
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-violet-400 font-bold text-lg w-12">
                  {quality}%
                </span>
              </div>
              <div className="flex gap-2">
                {[40, 60, 80].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${quality === q ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                  >
                    {q}%
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
                  className="w-28 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height px"
                  className="w-28 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
                <span className="text-slate-500 text-xs">
                  (leave blank to keep ratio)
                </span>
              </div>
            </div>
          )}

          {operation === "crop" && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-slate-300 text-sm font-medium">Crop</label>
              {[
                ["X", cropX, setCropX],
                ["Y", cropY, setCropY],
                ["W", cropW, setCropW],
                ["H", cropH, setCropH],
              ].map(([label, val, setter]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs w-4">{label}</span>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="w-20 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              ))}
            </div>
          )}

          {operation === "remove-bg" && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🪄</span>
              <div>
                <p className="text-white font-medium text-sm">
                  AI Background Removal
                </p>
                <p className="text-slate-400 text-xs">
                  Automatically removes the background and outputs a PNG
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Process button */}
      <motion.button
        whileHover={{
          scale: files.length ? 1.02 : 1,
          boxShadow: files.length ? "0 0 40px rgba(139,92,246,0.5)" : "none",
        }}
        whileTap={{ scale: files.length ? 0.98 : 1 }}
        onClick={processImages}
        disabled={!files.length || processing}
        className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-300 relative overflow-hidden mb-8 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background:
            files.length && !processing
              ? "linear-gradient(135deg, #7c3aed, #6d28d9, #7c3aed)"
              : "rgba(109,40,217,0.4)",
          backgroundSize: "200% 100%",
        }}
      >
        {processing && <div className="shimmer absolute inset-0" />}
        {processing
          ? `Processing... ${progress}%`
          : `✨ Process ${files.length > 1 ? `${files.length} Images` : "Image"}`}
      </motion.button>

      {/* Progress bar */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="mb-6"
          >
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Processing images...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full progress-bar-shine"
                style={{
                  background: "linear-gradient(90deg, #7c3aed, #22d3ee)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {savings > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 rounded-2xl text-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                <p className="text-emerald-400 font-semibold">
                  🎉 Saved {formatBytes(savings)} total!
                </p>
              </motion.div>
            )}

            <h3 className="text-lg font-bold text-white mb-4">Results</h3>
            <div className="space-y-3">
              {results.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`glass rounded-2xl p-4 flex items-center justify-between gap-4 ${r.error ? "border-red-500/30" : "border-emerald-500/20"}`}
                  style={{
                    border: `1px solid ${r.error ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)"}`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${r.error ? "bg-red-500/20" : "bg-emerald-500/20"}`}
                    >
                      {r.error ? "✕" : "✓"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {r.originalName}
                      </p>
                      {r.error ? (
                        <p className="text-red-400 text-xs mt-0.5">{r.error}</p>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-400 text-xs">
                            {formatBytes(r.beforeSize)}
                          </span>
                          <span className="text-slate-600 text-xs">→</span>
                          <span
                            className={`text-xs font-medium ${r.afterSize < r.beforeSize ? "text-emerald-400" : "text-slate-400"}`}
                          >
                            {formatBytes(r.afterSize)}
                          </span>
                          {r.beforeSize > r.afterSize && (
                            <span className="text-emerald-400 text-xs bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                              -
                              {Math.round(
                                (1 - r.afterSize / r.beforeSize) * 100,
                              )}
                              %
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!r.error && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const baseName = (r.originalName || "image").replace(
                          /\.[^.]+$/,
                          "",
                        );
                        handleDownload(
                          r.downloadUrl,
                          `${baseName}.${r.format || "png"}`,
                        );
                      }}
                      className="flex-shrink-0 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-1.5"
                    >
                      ⬇ Download
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
