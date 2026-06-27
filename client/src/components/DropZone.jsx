import React, { useCallback, useState } from "react";

export default function DropZone({ accept, multiple, onFiles, label }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        accept
          ? accept.some(
              (a) => f.type.includes(a) || f.name.match(new RegExp(a, "i")),
            )
          : true,
      );
      if (files.length) onFiles(files);
    },
    [accept, onFiles],
  );

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(files);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
        dragging
          ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
          : "border-slate-600 hover:border-slate-500 bg-slate-800/50"
      }`}
    >
      <input
        type="file"
        accept={accept?.join(",")}
        multiple={multiple}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
      <div className="text-5xl mb-4">📁</div>
      <p className="text-slate-300 font-medium">
        {label || "Drop files here or click to browse"}
      </p>
      <p className="text-slate-500 text-sm mt-1">
        {multiple
          ? "Select multiple files for batch processing"
          : "Select a file to process"}
      </p>
    </div>
  );
}
