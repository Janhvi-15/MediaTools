import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

//const API = "http://localhost:3001";
// ✅ Replace with this import
import API from "../config.js"; // for files inside components/
// OR
import API from "./config.js"; // for App.jsx which is in src/

export default function AuthModal({ onAuth, onClose }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body =
        mode === "register" ? { name, email, password } : { email, password };
      const res = await fetch(`${API}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 30 }}
        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
        className="w-full max-w-md rounded-2xl relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(20,10,40,0.98) 0%, rgba(10,5,25,0.98) 100%)",
          border: "1px solid rgba(139,92,246,0.2)",
          boxShadow:
            "0 0 80px rgba(139,92,246,0.2), 0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative p-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            ✕
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center text-white">
              ✦
            </div>
            <span className="font-bold text-white">
              Media<span className="gradient-text">Tools</span>
            </span>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className="relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
              >
                {mode === m && (
                  <motion.div
                    layoutId="authMode"
                    className="absolute inset-0 bg-violet-600 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span
                  className={`relative z-10 ${mode === m ? "text-white" : "text-slate-400"}`}
                >
                  {m === "login" ? "Sign In" : "Sign Up"}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-violet-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-600"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "register" ? "Min 6 characters" : "••••••••"
                }
                required
                className="w-full bg-white/5 border border-white/10 focus:border-violet-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-600"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm"
                >
                  <span>⚠</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 0 30px rgba(139,92,246,0.4)",
              }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Please wait...
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
