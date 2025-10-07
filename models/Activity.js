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
    required: false, // not needed for mint
  },
  to: {
    type: String,
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
    default: "sepolia", // or whatever network you use
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

// Optional — for sorting newest first
activitySchema.index({ timestamp: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
