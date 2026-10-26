const Dealer = require("../model/dealerModel");

// Get all dealer partnership requests
exports.getAllDealers = async (req, res) => {
  try {
    const dealers = await Dealer.find({ isDeleted: false }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: dealers.length,
      data: dealers,
    });
  } catch (error) {
    console.error("Fetch dealers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dealer requests" });
  }
};

// Create a new dealer request with documents
exports.createDealerRequest = async (req, res) => {
  try {
    const { name, location, contact, email, panNumber, gstinNumber } = req.body;
    
    if (!name || !location || !contact || !email) {
      return res.status(400).json({ success: false, message: "Required applicant details are missing" });
    }

    const files = req.files || {};
    
    // Map uploaded file paths if present
    const getFilePath = (fieldName) => {
      return files[fieldName] ? `/uploads/dealers/${files[fieldName][0].filename}` : "";
    };

    const dealer = await Dealer.create({
      name,
      location,
      contact,
      email,
      panNumber: panNumber || "",
      gstinNumber: gstinNumber || "",
      aadhar: getFilePath("aadhar"),
      pan: getFilePath("pan"),
      gstin: getFilePath("gstin"),
      tradeLicense: getFilePath("tradeLicense"),
      cancelledCheque: getFilePath("cancelledCheque"),
    });

    return res.status(201).json({
      success: true,
      message: "Dealer partnership application submitted successfully with documents",
      data: dealer,
    });
  } catch (error) {
    console.error("Create dealer error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

// Approve dealer request status
exports.approveDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findByIdAndUpdate(
      id,
      { status: "Approved" },
      { new: true, runValidators: true }
    );

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer request not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Dealer request approved successfully",
      data: dealer,
    });
  } catch (error) {
    console.error("Approve dealer error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve dealer request" });
  }
};