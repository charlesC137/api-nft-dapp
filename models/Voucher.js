const mongoose = require("mongoose");

const VoucherSchema = new mongoose.Schema({
  creator: { type: String, required: true },
  uri: { type: String, required: true },
  price: { type: String, required: true },
  signature: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  name: String,
  categories: [String],
  description: String,
  isListed: Boolean,
  expiry: { type: Date, required: true },
});

module.exports = mongoose.model("Voucher", VoucherSchema);
