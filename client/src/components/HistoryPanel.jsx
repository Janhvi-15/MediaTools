import React from "react";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function HistoryPanel({ history }) {
  if (!history?.length) {
    return (
      <div className="text-center py-20 text-slate-500">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-lg">No processing history yet.</p>
        <p className="text-sm">
          Process an image or video to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Processing History</h2>

      <div className="space-y-2">
        {history.map((item, i) => {
          const date =
            item?.timestamp && !isNaN(new Date(item.timestamp).getTime())
              ? new Date(item.timestamp)
              : null;

          return (
            <div
              key={item.id || item.timestamp || i}
              className="bg-slate-800 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="text-2xl">
                {item?.type === "image" ? "🖼️" : "🎬"}
              </div>

              <div className="flex-1">
                <p className="text-white font-medium">
                  {item?.originalName || "Unnamed"}
                </p>

                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                  <span className="bg-slate-700 px-2 py-0.5 rounded">
                    {item?.operation || "Unknown"}
                  </span>

                  {item?.savings ? (
                    <span className="text-green-400">
                      -{item.savings}% saved
                    </span>
                  ) : null}

                  <span>{date ? date.toLocaleTimeString() : "—"}</span>
                </div>
              </div>

              {item?.downloadUrl && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(item.downloadUrl);
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);

                      const a = document.createElement("a");
                      a.href = blobUrl;

                      const baseName = (item.originalName || "file").replace(
                        /\.[^.]+$/,
                        "",
                      );

                      const ext =
                        item.format ||
                        new URL(item.downloadUrl).pathname.split(".").pop() ||
                        "png";

                      a.download = `${baseName}.${ext}`;

                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);

                      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    } catch (err) {
                      alert("Download failed: " + err.message);
                    }
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  ⬇ Download
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
