const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  tokenId: Number,
  creator: { type: String, index: true, lowercase: true },
  owner: { type: String, index: true, lowercase: true },
  uri: String,
  price: String,
  isListed: Boolean,
  createdAt: { type: Date },
  modifiedAt: { type: Date, default: Date.now },
  randomKey: { type: Number, required: true },
});

module.exports = mongoose.model("NFT", NFTSchema);
