const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  quantityUnit: {
    type: String,
    enum: ["g", "kg", "ml", "liter", "piece"],
    default: "piece"
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  usageDays: {
    type: Number,
    required: true,
    min: 1
  },
  daysLeft: {
    type: Number,
    required: true,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Item", itemSchema);

