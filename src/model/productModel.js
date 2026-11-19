
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    litre: {
      type: String,
      required: false,
      trim: true,
    },

    // Uploaded product image URL
    imageURL: {
      type: String,
      default: null,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    hsn_code: {
      type: String,
      default: "3402",
      trim: true,
    },

    min_stock_level: {
      type: Number,
      default: 10,
      min: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);

