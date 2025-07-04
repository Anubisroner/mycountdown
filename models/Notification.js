const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: String,
  username: String,
  email: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("Notification", notificationSchema);
