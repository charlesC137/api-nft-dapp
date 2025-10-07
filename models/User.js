const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, lowercase: true },
  nonce: String,
  createdAt: { type: Date, default: Date.now },
  username: String,
  bio: String,
  bookmarkedNFTs: [String],
  ownedNFTs: [String],
  private: { type: Boolean, default: true },
});

module.exports = mongoose.model("User", userSchema);
