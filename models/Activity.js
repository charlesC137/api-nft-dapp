const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  nftId: {
    type: String,
    required: true,
  },
  nftType: {
    type: String,
    enum: ["nft", "voucher"],
    required: true,
  },
  type: {
    type: String,
    enum: [
      "mint",
      "list",
      "unlist",
      "buy",
      "sell",
      "transfer",
      "burn",
      "voucherCreated",
    ],
    required: true,
  },
  from: {
    type: String,
    lowercase: true,
    required: false, // not needed for mint
  },
  to: {
    type: String,
    lowercase: true,
    required: false, // not needed for unlist
  },
  price: {
    type: String,
    required: false,
  },
  txHash: {
    type: String,
    required: false,
  },
  network: {
    type: String,
    default: "hardhat", // or whatever network you use
  },
  blockNumber: {
    type: Number,
    required: false,
  },
  gasUsed: {
    type: String,
    required: false,
  },
  marketplaceId: {
    type: String,
    lowercase: true,
    required: false,
  },
  metadata: {
    name: String,
    image: String,
    category: String,
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Activity", activitySchema);
