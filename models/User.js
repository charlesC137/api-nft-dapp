const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, lowercase: true },
  nonce: String,
  createdAt: { type: Date, default: Date.now },
  username: String,
  bio: String,
  avatar: String,
});

module.exports = mongoose.model("User", userSchema);
