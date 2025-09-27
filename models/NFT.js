const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  tokenId: Number,
  creator: String,
  owner: String,
  uri: String, // fake ipfs:// CID or local endpoint
  metadata: {
    name: String,
    description: String,
    image: String,
    //attributes: [{ trait_type: String, value: String }]
    categories: [String],
  },
  price: String,
  isListed: Boolean,
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  randomKey: { type: Number, required: true },
});

module.exports = mongoose.model("NFT", NFTSchema);
