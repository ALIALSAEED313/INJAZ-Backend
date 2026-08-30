const mongoose = require("mongoose");

const searchSchema = new mongoose.Schema({
  term: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  count: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("Search", searchSchema);
