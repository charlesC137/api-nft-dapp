const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, lowercase: true, index: true },
  nonce: String,
  createdAt: { type: Date, default: Date.now },
  username: { type: String, default: "", unique: true },
  bio: { type: String, default: "" },
  bookmarkedNFTs: [String],
  private: { type: Boolean, default: true },
});

module.exports = mongoose.model("User", userSchema);
