const express = require("express");
const router = express.Router();
const uploadDealerDocuments = require("../middleware/uploadDealerMiddleware");
const { verifyTokenOptional } = require("../middleware/authMiddleware");
const {
  getAllDealers,
  getApprovedDealers,
  createDealerRequest,
  updateDealerVerification,
  approveDealer,
} = require("../controller/dealerController");

// Public route to submit dealer application with multipart/form-data documents
router.post("/create", uploadDealerDocuments, createDealerRequest);

// Route for Billing POS to fetch approved wholesale dealers
router.get("/approved", getApprovedDealers);

// Protected routes for Admin review
router.get("/all", verifyTokenOptional, getAllDealers);
router.put("/:id/documents", verifyTokenOptional, uploadDealerDocuments, updateDealerVerification);
router.patch("/:id/approve", verifyTokenOptional, approveDealer);
router.post("/:id/approve", verifyTokenOptional, approveDealer);

module.exports = router;