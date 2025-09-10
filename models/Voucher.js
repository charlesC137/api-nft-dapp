const mongoose = require("mongoose");

const VoucherSchema = new mongoose.Schema({
  creator: String,
  uri: String, // fake ipfs:// CID or local endpoint
  metadata: {
    name: String,
    description: String,
    image: String,
    //attributes: [{ trait_type: String, value: String }]
    categories: [String],
  },
  price: String,
  signature: String,
  isListed: Boolean,
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  expiry: { type: Date, required: true },
});

module.exports = mongoose.model("Voucher", VoucherSchema);
