const mongoose = require("mongoose");

const dealerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    
    // Text Identifiers
    panNumber: { type: String, trim: true, default: "" },
    gstinNumber: { type: String, trim: true, default: "" },

    // Document File Paths
    aadhar: { type: String, default: "" },
    pan: { type: String, default: "" },
    gstin: { type: String, default: "" },
    tradeLicense: { type: String, default: "" },
    cancelledCheque: { type: String, default: "" },

    status: { 
      type: String, 
      enum: ["Pending Review", "Approved", "Rejected"], 
      default: "Pending Review" 
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dealer", dealerSchema);