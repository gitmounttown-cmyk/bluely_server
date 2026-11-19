const Dealer = require("../model/dealerModel");

// Get all dealer partnership requests (with optional status filter)
exports.getAllDealers = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const dealers = await Dealer.find(filter).sort({ createdAt: -1 });
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

// Get approved dealers for Billing POS dropdown
exports.getApprovedDealers = async (req, res) => {
  try {
    const dealers = await Dealer.find({ isDeleted: false, status: "Approved" }).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: dealers.length,
      data: dealers,
    });
  } catch (error) {
    console.error("Fetch approved dealers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch approved dealers" });
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

// Update dealer verification documents, flags, and admin notes (Save Progress)
exports.updateDealerVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findById(id);

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer request not found" });
    }

    // Check if new document files were uploaded by admin
    const files = req.files || {};
    const getFilePath = (fieldName) => {
      return files[fieldName] ? `/uploads/dealers/${files[fieldName][0].filename}` : "";
    };

    if (getFilePath("aadhar")) dealer.aadhar = getFilePath("aadhar");
    if (getFilePath("pan")) dealer.pan = getFilePath("pan");
    if (getFilePath("gstin")) dealer.gstin = getFilePath("gstin");
    if (getFilePath("tradeLicense")) dealer.tradeLicense = getFilePath("tradeLicense");
    if (getFilePath("cancelledCheque")) dealer.cancelledCheque = getFilePath("cancelledCheque");

    // Parse verifiedDocs
    if (req.body.verifiedDocs) {
      let vDocs = req.body.verifiedDocs;
      if (typeof vDocs === "string") {
        try {
          vDocs = JSON.parse(vDocs);
        } catch (_) {}
      }
      if (typeof vDocs === "object" && vDocs !== null) {
        dealer.verifiedDocs = {
          aadhar: Boolean(vDocs.aadhar),
          pan: Boolean(vDocs.pan),
          gstin: Boolean(vDocs.gstin),
          tradeLicense: Boolean(vDocs.tradeLicense),
          cancelledCheque: Boolean(vDocs.cancelledCheque),
        };
      }
    }

    if (req.body.adminNotes !== undefined) {
      dealer.adminNotes = req.body.adminNotes;
    }

    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer verification progress saved successfully",
      data: dealer,
    });
  } catch (error) {
    console.error("Update dealer verification error:", error);
    return res.status(500).json({ success: false, message: "Failed to save verification progress" });
  }
};

// Approve dealer request status (Conditional Approval only when all documents are verified)
exports.approveDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findById(id);

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer request not found" });
    }

    // Conditional approval: all 5 mandatory documents must be verified
    const v = dealer.verifiedDocs || {};
    const allVerified = Boolean(
      v.aadhar && v.pan && v.gstin && v.tradeLicense && v.cancelledCheque
    );

    // If override not requested and documents are missing/unverified
    if (!allVerified && req.body.forceApprove !== true) {
      return res.status(400).json({
        success: false,
        message: "Approval blocked: All 5 mandatory verification documents (Aadhaar, PAN, GSTIN, Trade License, and Cancelled Cheque) must be verified and marked as OK before approval.",
      });
    }

    dealer.status = "Approved";
    dealer.portalCredentials = {
      username: dealer.email,
      accessCode: "DLR-" + Math.floor(100000 + Math.random() * 900000),
      generatedAt: new Date(),
    };

    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer onboarded and approved successfully with credentials generated",
      data: dealer,
    });
  } catch (error) {
    console.error("Approve dealer error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve dealer request" });
  }
};