const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    addresses: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
