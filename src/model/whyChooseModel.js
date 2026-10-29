const mongoose = require("mongoose");

const whyChooseUsSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    image: { 
      type: String, 
      required: true 
    },
    extraClass: { 
      type: String, 
      default: "" // Used for custom grid alignment if needed (e.g., bottom-left, bottom-right)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WhyChooseUs", whyChooseUsSchema);