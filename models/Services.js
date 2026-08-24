const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
    trim: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  deliveryTime: {
    type: Number,
    required: true,
    min: 1,
  },

  images: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model("Service", serviceSchema);
