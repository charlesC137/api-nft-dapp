const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  tokenId: Number,
  uri: String,
  title: String,
  image: String,
  price: Number,
  owner: String,
  creator: String,
  modifiedAt: Date,
  isListed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NFT", NFTSchema);
