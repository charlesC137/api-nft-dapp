const mongoose = require("mongoose");

const VoucherSchema = new mongoose.Schema({
  creator: { type: String, index: true, lowercase: true },
  owner: { type: String, index: true, lowercase: true },
  uri: String,
  price: String,
  signature: String,
  isListed: Boolean,
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  expiry: { type: Date, required: true },
  randomKey: { type: Number, required: true, index: true },
});

module.exports = mongoose.model("Voucher", VoucherSchema);
