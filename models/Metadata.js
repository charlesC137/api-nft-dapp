const mongoose = require("mongoose");

const MetadataSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String,
  categories: [String],
  createdAt: { type: Date, default: Date.now() },
  attributes: [{ trait_type: String, value: String }],
  itemId: { type: String, index: true },
});

module.exports = mongoose.model("Metadata", MetadataSchema);
