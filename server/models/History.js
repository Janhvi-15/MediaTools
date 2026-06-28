import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    operation: { type: String },
    format: { type: String },
    originalName: { type: String },
    originalSize: { type: Number },
    outputSize: { type: Number },
    savings: { type: Number },
    downloadUrl: { type: String },
    type: { type: String }, // "image" or "video"
  },
  { timestamps: true },
);

export default mongoose.model("History", historySchema);
