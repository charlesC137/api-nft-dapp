const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  value: String,
  icon: String,
});

module.exports = mongoose.model("Category", CategorySchema);
