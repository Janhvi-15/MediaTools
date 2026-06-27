import React from "react";

export default function ProgressBar({ progress, label }) {
  return (
    <div className="w-full">
      {label && <p className="text-sm text-slate-400 mb-2">{label}</p>}
      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-right">
        {Math.round(progress)}%
      </p>
    </div>
  );
}
