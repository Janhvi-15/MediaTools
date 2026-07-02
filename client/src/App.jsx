import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ImageTools from "./components/ImageTools.jsx";
import VideoTools from "./components/VideoTools.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import AuthModal from "./components/AuthModal.jsx";

//const API = "http://localhost:3001";
// ✅ Replace with this import
import API from "../config.js"; // for files inside components/
// OR
//import API from "./config.js"; // for App.jsx which is in src/

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

const navItems = [
  {
    id: "image",
    label: "Image Tools",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="w-5 h-5"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
    color: "violet",
    desc: "Convert, compress, resize",
  },
  {
    id: "video",
    label: "Video Tools",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="w-5 h-5"
      >
        <rect x="2" y="6" width="15" height="12" rx="2" />
        <path d="M17 9l5-3v12l-5-3V9z" />
      </svg>
    ),
    color: "cyan",
    desc: "Compress, convert, extract",
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="w-5 h-5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
    color: "emerald",
    desc: "Past processed files",
  },
];

export default function App() {
  const [tab, setTab] = useState("image");
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
        fetchHistory();
      } catch {}
    }
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch {}
  };

  const handleAuth = (userData) => {
    setUser(userData);
    setShowAuth(false);
    fetchHistory();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setHistory([]);
  };

  const addHistory = async (item) => {
    setHistory((prev) => [item, ...prev].slice(0, 100));
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${API}/api/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });
    } catch {}
  };

  const clearHistory = async () => {
    setHistory([]);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${API}/api/history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  };

  const totalSaved = history.reduce(
    (acc, h) =>
      h.beforeSize && h.afterSize && h.beforeSize > h.afterSize
        ? acc + (h.beforeSize - h.afterSize)
        : acc,
    0,
  );

  const currentNav = navItems.find((n) => n.id === tab);

  return (
    <div
      className="min-h-screen flex relative"
      style={{ background: "#050816" }}
    >
      {/* Animated background blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #7c3aed, transparent)",
            top: "-100px",
            left: "-100px",
            animation: "blob1 14s infinite ease-in-out",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, #0891b2, transparent)",
            bottom: "-80px",
            right: "-80px",
            animation: "blob2 18s infinite ease-in-out",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #a78bfa, transparent)",
            top: "50%",
            left: "50%",
            animation: "blob1 20s infinite ease-in-out reverse",
          }}
        />
      </div>

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-20 flex flex-col w-64 min-h-screen border-r border-white/5"
        style={{
          background: "rgba(5,8,22,0.85)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                boxShadow: "0 0 20px rgba(124,58,237,0.5)",
              }}
            >
              ✦
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">
                Media
                <span
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Tools
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
            Tools
          </div>
          {navItems.map((item) => {
            const isActive = tab === item.id;
            const colors = {
              violet: {
                bg: "rgba(124,58,237,0.15)",
                border: "rgba(124,58,237,0.4)",
                text: "#a78bfa",
                glow: "rgba(124,58,237,0.2)",
              },
              cyan: {
                bg: "rgba(8,145,178,0.15)",
                border: "rgba(8,145,178,0.4)",
                text: "#22d3ee",
                glow: "rgba(8,145,178,0.2)",
              },
              emerald: {
                bg: "rgba(16,185,129,0.15)",
                border: "rgba(16,185,129,0.4)",
                text: "#34d399",
                glow: "rgba(16,185,129,0.2)",
              },
            }[item.color];

            return (
              <motion.button
                key={item.id}
                onClick={() => setTab(item.id)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group"
                style={
                  isActive
                    ? {
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        boxShadow: `0 0 20px ${colors.glow}`,
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                      }
                }
              >
                <div
                  className="flex-shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? colors.text : "#64748b" }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold transition-colors duration-200"
                    style={{ color: isActive ? "white" : "#94a3b8" }}
                  >
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors mt-0.5">
                    {item.desc}
                  </div>
                </div>
                {item.id === "history" && history.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {history.length}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Stats */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <div className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
            Session Stats
          </div>
          {[
            {
              label: "Images",
              value: history.filter((h) => h.type !== "video").length,
              icon: "🖼️",
            },
            {
              label: "Videos",
              value: history.filter((h) => h.type === "video").length,
              icon: "🎬",
            },
            {
              label: "Space Saved",
              value: formatBytes(totalSaved),
              icon: "💾",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{stat.icon}</span>
                <span className="text-slate-500 text-xs">{stat.label}</span>
              </div>
              <span className="text-white text-xs font-semibold">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* User section */}
        <div className="px-3 py-4 border-t border-white/5">
          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="user"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                    }}
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {user.name}
                    </div>
                    <div className="text-slate-500 text-xs truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full mt-2 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  Sign Out
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="anon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <p className="text-slate-600 text-xs px-3 mb-2">
                  Sign in to save your history across sessions
                </p>
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuth(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  }}
                >
                  Sign In / Sign Up
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Top bar */}
        <motion.header
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-between px-8 py-4 border-b border-white/5"
          style={{
            background: "rgba(5,8,22,0.6)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="text-white font-bold text-xl">
                {currentNav?.label}
              </div>
              <div
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}
              >
                Free
              </div>
            </div>
            <div className="text-slate-500 text-sm mt-0.5">
              {currentNav?.desc}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick stats */}
            <div
              className="hidden md:flex items-center gap-4 px-4 py-2 rounded-xl mr-2"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-center">
                <div className="text-white font-bold text-sm">
                  {history.length}
                </div>
                <div className="text-slate-600 text-xs">Processed</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <div className="text-emerald-400 font-bold text-sm">
                  {formatBytes(totalSaved)}
                </div>
                <div className="text-slate-600 text-xs">Saved</div>
              </div>
            </div>

            {user ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                  }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-300 text-sm font-medium">
                  {user.name}
                </span>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                }}
              >
                Sign In
              </motion.button>
            )}
          </div>
        </motion.header>

        {/* Page content */}
        <main className="flex-1 overflow-auto px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {tab === "image" && <ImageTools onResult={addHistory} />}
              {tab === "video" && <VideoTools onResult={addHistory} />}
              {tab === "history" && (
                <HistoryPanel history={history} onClear={clearHistory} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showAuth && (
          <AuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
