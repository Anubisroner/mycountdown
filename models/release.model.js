const mongoose = require("mongoose");

const ReleaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["FILM", "SERIE", "JEU"], required: true },
  season: Number,
  platform: String,
  cover: { type: String, required: true },
  url: { type: String, required: true },
  releaseDate: Date,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

module.exports = mongoose.model("Release", ReleaseSchema);
