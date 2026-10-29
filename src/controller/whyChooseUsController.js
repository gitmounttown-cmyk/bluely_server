const WhyChooseUs = require("../model/whyChooseModel");

// GET: Fetch all Why Choose Us features (Public)
const getAllWhyChooseUs = async (req, res) => {
  try {
    const items = await WhyChooseUs.find({});
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST: Create a new Why Choose Us item via FormData (Admin Only)
const createWhyChooseUs = async (req, res) => {
  try {
    // Extract text fields sent via FormData
    const { title, extraClass } = req.body;
    
    // Check if an image file was uploaded via multer
    let imagePath = "";
    if (req.file) {
      // Saves the file path or destination stored by multer
      imagePath = req.file.path || req.file.filename;
    } else {
      return res.status(400).json({ message: "Image file is required for Why Choose Us item" });
    }

    const newItem = await WhyChooseUs.create({
      title,
      image: imagePath,
      extraClass: extraClass || "",
    });

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE: Remove a Why Choose Us item (Admin Only)
const deleteWhyChooseUs = async (req, res) => {
  try {
    const item = await WhyChooseUs.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllWhyChooseUs,
  createWhyChooseUs,
  deleteWhyChooseUs,
};